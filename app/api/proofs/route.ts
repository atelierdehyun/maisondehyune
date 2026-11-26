import { NextResponse } from 'next/server';
import { randomUUID, createHash, createHmac } from 'crypto';
import { db, requireAdmin, requireUser } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const clean = (value: unknown, max = 160) =>
  String(value ?? '').trim().slice(0, max);

const parseObject = (value: any) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

const sha256 = (value: Buffer | string) =>
  createHash('sha256').update(value).digest('hex');

const hmac = (key: Buffer | string, value: string) =>
  createHmac('sha256', key).update(value).digest();

const awsEncode = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

function getR2Config() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('R2_NOT_CONFIGURED');
  }

  return {
    endpoint: endpoint.replace(/\/+$/, ''),
    accessKeyId,
    secretAccessKey,
    bucket,
  };
}

function getObjectUrl(endpoint: string, bucket: string, key: string) {
  const url = new URL(endpoint);
  const basePath = url.pathname.replace(/\/+$/, '');
  const objectPath = `${basePath}/${awsEncode(bucket)}/${key
    .split('/')
    .map(awsEncode)
    .join('/')}`;

  url.pathname = objectPath;
  url.search = '';
  return url;
}

function getSigningKey(secret: string, date: string) {
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, 'auto');
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}
function signRequest(
  method: string,
  url: URL,
  headers: Record<string, string>,
  payloadHash: string,
  accessKeyId: string,
  secretAccessKey: string
) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);

  const allHeaders: Record<string, string> = {
    host: url.host,
    ...Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        key.toLowerCase(),
        value.trim(),
      ])
    ),
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  const signedHeaders = Object.keys(allHeaders).sort().join(';');
  const canonicalHeaders = Object.keys(allHeaders)
    .sort()
    .map((key) => `${key}:${allHeaders[key]}\n`)
    .join('');

  const canonicalRequest = [
    method,
    url.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${date}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const signature = createHmac(
    'sha256',
    getSigningKey(secretAccessKey, date)
  )
    .update(stringToSign)
    .digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Authorization: authorization,
  };
}

async function uploadToR2(
  key: string,
  bytes: Buffer,
  contentType: string,
  email: string,
  scope: string
) {
  const config = getR2Config();
  const url = getObjectUrl(config.endpoint, config.bucket, key);
  const payloadHash = sha256(bytes);

  const headers = signRequest(
    'PUT',
    url,
    {
      'content-type': contentType,
      'cache-control': 'private, no-store, max-age=0',
      'x-amz-meta-owner': Buffer.from(email).toString('base64'),
      'x-amz-meta-scope': scope,
    },
    payloadHash,
    config.accessKeyId,
    config.secretAccessKey
  );

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers,
    body: bytes,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`R2_UPLOAD_FAILED: ${response.status} ${detail.slice(0, 300)}`);
  }
}
async function deleteFromR2(key: string) {
  const config = getR2Config();
  const url = getObjectUrl(config.endpoint, config.bucket, key);
  const payloadHash = sha256('');

  const headers = signRequest(
    'DELETE',
    url,
    {},
    payloadHash,
    config.accessKeyId,
    config.secretAccessKey
  );

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`R2_DELETE_FAILED: ${response.status}`);
  }
}

function createSignedDownloadUrl(key: string, expiresIn = 600) {
  const config = getR2Config();
  const url = getObjectUrl(config.endpoint, config.bucket, key);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const credentialScope = `${date}/auto/s3/aws4_request`;

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  };

  const canonicalQuery = Object.entries(query)
    .map(([key, value]) => [awsEncode(key), awsEncode(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const canonicalRequest = [
    'GET',
    url.pathname,
    canonicalQuery,
    `host:${url.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const signature = createHmac(
    'sha256',
    getSigningKey(config.secretAccessKey, date)
  )
    .update(stringToSign)
    .digest('hex');

  url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return url.toString();
}

function getExtension(type: string) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'pdf';
}
export async function POST(request: Request) {
  let uploadedKey = '';

  try {
    const user = await requireUser(request);
    const email = clean(user.email, 180).toLowerCase();

    if (!email) throw new Error('UNAUTHORIZED');

    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Selecciona un comprobante.' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo debe pesar hasta 8 MB.' },
        { status: 413 }
      );
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: 'Usa JPG, PNG, WebP o PDF.' },
        { status: 415 }
      );
    }

    const scope = clean(form.get('scope'), 12).toUpperCase();

    if (!['GO', 'SHOP'].includes(scope)) {
      return NextResponse.json(
        { error: 'Selecciona GO o Shop.' },
        { status: 400 }
      );
    }

    const goTitle = scope === 'GO' ? clean(form.get('goTitle'), 180) : '';
    const amount = Math.round(Number(form.get('amount')) * 100) / 100;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Indica un importe de abono válido.' },
        { status: 400 }
      );
    }

    if (scope === 'GO' && !goTitle) {
      return NextResponse.json(
        { error: 'Selecciona el Group Order del comprobante.' },
        { status: 400 }
      );
    }

    if (scope === 'GO') {
      const trackingSnap = await db
        .collection('seguimiento_claims')
        .where('user_email', '==', email)
        .get();

      const cancelledClaims = new Set(
        trackingSnap.docs
          .filter((doc) => doc.data().estado_confirmacion === 'Cancelado')
          .map((doc) => String(doc.data().claim_key || ''))
      );

      const activeProductIds = Array.from(
        new Set(
          trackingSnap.docs
            .filter((doc) => doc.data().estado_confirmacion !== 'Cancelado')
            .map((doc) => String(doc.data().claim_key || '').split('-')[0])
            .filter(Boolean)
        )
      );

      const productDocs = activeProductIds.length
        ? (
            await db.getAll(
              ...activeProductIds.map((pid) =>
                db.collection('productos').doc(pid)
              )
            )
          ).filter((doc) => doc.exists)
        : (await db.collection('productos').limit(500).get()).docs;

      const goIds = new Set<string>();

      for (const productDoc of productDocs) {
        const product = productDoc.data() || {};
        const claims = parseObject(product.claims_integrantes);

        const belongs = Object.entries(claims).some(
          ([slot, claim]: [string, any]) => {
            if (cancelledClaims.has(`${productDoc.id}-${slot}`)) return false;

            if (typeof claim === 'string') {
              return claim.trim().toLowerCase() === email;
            }

            if (!claim || typeof claim !== 'object' || Array.isArray(claim)) {
              return false;
            }

            const own = Object.entries(claim).find(
              ([mail, quantity]) =>
                mail.trim().toLowerCase() === email && Number(quantity) > 0
            );

            return Boolean(own);
          }
        );

        if (belongs && product.go_id !== undefined && product.go_id !== null) {
          goIds.add(String(product.go_id));
        }
      }
      const goRefs = Array.from(goIds).map((id) =>
        db.collection('gos').doc(id)
      );
      const goSnaps = goRefs.length ? await db.getAll(...goRefs) : [];

      const belongs = goSnaps.some(
        (snap) =>
          snap.exists && String(snap.data()?.title || '').trim() === goTitle
      );

      if (!belongs) {
        return NextResponse.json(
          { error: 'No encontramos pedidos tuyos en ese Group Order.' },
          { status: 403 }
        );
      }
    } else {
      const shopOrders = await db
        .collection('pedidos')
        .where('user_email', '==', email)
        .limit(50)
        .get();

      if (
        !shopOrders.docs.some(
          (doc) =>
            String(doc.data().tipo_servicio || '').toUpperCase() === 'SHOP'
        )
      ) {
        return NextResponse.json(
          { error: 'No encontramos pedidos de Shop asociados a tu cuenta.' },
          { status: 403 }
        );
      }
    }

    const id = randomUUID();
    const extension = getExtension(file.type);
    const safeUid = String(user.uid).replace(/[^a-zA-Z0-9_-]/g, '');
    const storagePath = `payment-proofs/${safeUid}/${id}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await uploadToR2(storagePath, bytes, file.type, email, scope);
    uploadedKey = storagePath;

    const record = {
      owner_email: email,
      scope,
      go_title: goTitle || null,
      amount,
      currency: 'USD',
      storage_path: storagePath,
      storage_provider: 'r2',
      file_name: clean(file.name, 180),
      mime_type: file.type,
      size_bytes: file.size,
      status: 'Pendiente de revisión',
      created_at: new Date().toISOString(),
    };

    await db.collection('comprobantes_pago').doc(id).create(record);

    return NextResponse.json(
      { ok: true, id, status: record.status },
      { status: 201 }
    );
  } catch (error: any) {
    if (uploadedKey) {
      try {
        await deleteFromR2(uploadedKey);
      } catch {
        // Se conserva el error principal.
      }
    }

    const message = error?.message || 'ERROR';
    const status =
      message === 'UNAUTHORIZED'
        ? 401
        : message === 'R2_NOT_CONFIGURED'
          ? 503
          : 500;

    return NextResponse.json(
      {
        error:
          message === 'R2_NOT_CONFIGURED'
            ? 'Cloudflare R2 no está configurado en el servidor.'
            : message,
      },
      { status }
    );
  }
}
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = clean(url.searchParams.get('id'), 100);

    if (!id) {
      return NextResponse.json(
        { error: 'Falta el identificador del comprobante.' },
        { status: 400 }
      );
    }

    const token = request.headers.get('authorization') || '';
    let email = '';
    let isAdmin = false;

    if (token) {
      try {
        const admin = await requireAdmin(request);
        email = clean(admin.email, 180).toLowerCase();
        isAdmin = true;
      } catch {
        const user = await requireUser(request);
        email = clean(user.email, 180).toLowerCase();
      }
    } else {
      const user = await requireUser(request);
      email = clean(user.email, 180).toLowerCase();
    }

    const ref = db.collection('comprobantes_pago').doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: 'Comprobante no encontrado.' },
        { status: 404 }
      );
    }

    const record = snap.data() || {};

    if (
      !isAdmin &&
      clean(record.owner_email, 180).toLowerCase() !== email
    ) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    if (record.storage_provider !== 'r2' || !record.storage_path) {
      return NextResponse.json(
        { error: 'Este comprobante todavía no está almacenado en R2.' },
        { status: 409 }
      );
    }

    const signedUrl = createSignedDownloadUrl(
      String(record.storage_path),
      600
    );

    return NextResponse.json(
      { url: signedUrl, expires_in_seconds: 600 },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error: any) {
    const message = error?.message || 'ERROR';
    const status =
      message === 'UNAUTHORIZED'
        ? 401
        : message === 'R2_NOT_CONFIGURED'
          ? 503
          : 403;

    return NextResponse.json(
      {
        error:
          message === 'R2_NOT_CONFIGURED'
            ? 'Cloudflare R2 no está configurado en el servidor.'
            : message,
      },
      { status }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const id = clean(body.id, 100);
    const status = clean(body.status, 40);

    if (!id || !['Verificado', 'Rechazado'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado de comprobante no válido.' },
        { status: 400 }
      );
    }

    const ref = db.collection('comprobantes_pago').doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: 'Comprobante no encontrado.' },
        { status: 404 }
      );
    }

    await ref.set(
      {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: clean(admin.email, 180).toLowerCase(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, id, status });
  } catch (error: any) {
    const message = error?.message || 'ERROR';
    return NextResponse.json(
      { error: message },
      { status: message === 'UNAUTHORIZED' ? 401 : 403 }
    );
  }
}
