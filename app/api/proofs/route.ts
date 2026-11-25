import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { db, requireAdmin, requireUser } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const clean = (value: unknown, max = 160) => String(value ?? '').trim().slice(0, max);
const parseObject = (value: any) => { if (value && typeof value === 'object' && !Array.isArray(value)) return value; if (typeof value !== 'string' || !value.trim()) return {}; try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } };

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const email = clean(user.email, 180).toLowerCase();
    if (!email) throw new Error('UNAUTHORIZED');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Selecciona un comprobante.' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_SIZE) return NextResponse.json({ error: 'El archivo debe pesar hasta 8 MB.' }, { status: 413 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Usa JPG, PNG, WebP o PDF.' }, { status: 415 });
    const scope = clean(form.get('scope'), 12).toUpperCase();
    if (!['GO', 'SHOP'].includes(scope)) return NextResponse.json({ error: 'Selecciona GO o Shop.' }, { status: 400 });
    const goTitle = scope === 'GO' ? clean(form.get('goTitle'), 180) : '';
    const amount = Math.round(Number(form.get('amount')) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Indica un importe de abono válido.' }, { status: 400 });
    if (scope === 'GO' && !goTitle) return NextResponse.json({ error: 'Selecciona el Group Order del comprobante.' }, { status: 400 });
    if (scope === 'GO') {
      const [productsSnap, trackingSnap] = await Promise.all([db.collection('productos').limit(1000).get(), db.collection('seguimiento_claims').where('user_email', '==', email).get()]);
      const cancelledClaims = new Set(trackingSnap.docs.filter((doc) => doc.data().estado_confirmacion === 'Cancelado').map((doc) => String(doc.data().claim_key || '')));
      const goIds = new Set<string>();
      for (const productDoc of productsSnap.docs) {
        const product = productDoc.data() || {};
        const claims = parseObject(product.claims_integrantes);
        const belongs = Object.entries(claims).some(([slot, claim]: [string, any]) => {
          if (cancelledClaims.has(`${productDoc.id}-${slot}`)) return false;
          if (typeof claim === 'string') return claim.trim().toLowerCase() === email;
          if (!claim || typeof claim !== 'object' || Array.isArray(claim)) return false;
          const own = Object.entries(claim).find(([mail, quantity]) => mail.trim().toLowerCase() === email && Number(quantity) > 0);
          return Boolean(own);
        });
        if (belongs && product.go_id !== undefined && product.go_id !== null) goIds.add(String(product.go_id));
      }
      const goRefs = Array.from(goIds).map((id) => db.collection('gos').doc(id));
      const goSnaps = goRefs.length ? await db.getAll(...goRefs) : [];
      const belongs = goSnaps.some((snap) => snap.exists && String(snap.data()?.title || '').trim() === goTitle);
      if (!belongs) return NextResponse.json({ error: 'No encontramos pedidos tuyos en ese Group Order.' }, { status: 403 });
    } else {
      const shopOrders = await db.collection('pedidos').where('user_email', '==', email).limit(1000).get();
      if (!shopOrders.docs.some((doc) => String(doc.data().tipo_servicio || '').toUpperCase() === 'SHOP')) return NextResponse.json({ error: 'No encontramos pedidos de Shop asociados a tu cuenta.' }, { status: 403 });
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return NextResponse.json({ error: 'Firebase Storage no tiene un bucket configurado. Revisa NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.' }, { status: 503 });
    const bucket = getStorage().bucket(bucketName);
    const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1].replace('jpeg', 'jpg');
    const id = randomUUID();
    const storagePath = `private-payment-proofs/${String(user.uid).replace(/[^a-zA-Z0-9_-]/g, '')}/${id}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await bucket.file(storagePath).save(bytes, {
      resumable: false,
      validation: 'md5',
      metadata: {
        contentType: file.type,
        cacheControl: 'private, no-store, max-age=0',
        metadata: { ownerEmail: email, scope, goTitle },
      },
    });
    const record = {
      owner_email: email, scope, go_title: goTitle || null, amount, currency: 'USD', storage_path: storagePath,
      file_name: clean(file.name, 180), mime_type: file.type, size_bytes: file.size,
      status: 'Pendiente de revisión', created_at: new Date().toISOString(),
    };
    await db.collection('comprobantes_pago').doc(id).create(record);
    return NextResponse.json({ ok: true, id, status: record.status }, { status: 201 });
  } catch (error: any) {
    const message = error?.message || 'ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = clean(url.searchParams.get('id'), 100);
    if (!id) return NextResponse.json({ error: 'Falta el identificador del comprobante.' }, { status: 400 });
    const token = request.headers.get('authorization') || '';
    let email = '';
    let isAdmin = false;
    if (token) {
      try { const admin = await requireAdmin(request); email = clean(admin.email, 180).toLowerCase(); isAdmin = true; }
      catch { const user = await requireUser(request); email = clean(user.email, 180).toLowerCase(); }
    } else {
      await requireUser(request);
    }
    const ref = db.collection('comprobantes_pago').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Comprobante no encontrado.' }, { status: 404 });
    const record = snap.data() || {};
    if (!isAdmin && clean(record.owner_email, 180).toLowerCase() !== email) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return NextResponse.json({ error: 'Firebase Storage no tiene un bucket configurado.' }, { status: 503 });
    const [signedUrl] = await getStorage().bucket(bucketName).file(String(record.storage_path)).getSignedUrl({ action: 'read', expires: Date.now() + 10 * 60 * 1000 });
    return NextResponse.json({ url: signedUrl, expires_in_seconds: 600 }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: any) {
    const message = error?.message || 'ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHORIZED' ? 401 : 403 });
  }
}


export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const id = clean(body.id, 100);
    const status = clean(body.status, 40);
    if (!id || !['Verificado', 'Rechazado'].includes(status)) {
      return NextResponse.json({ error: 'Estado de comprobante no válido.' }, { status: 400 });
    }
    const ref = db.collection('comprobantes_pago').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Comprobante no encontrado.' }, { status: 404 });
    await ref.set({ status, reviewed_at: new Date().toISOString(), reviewed_by: clean(admin.email, 180).toLowerCase() }, { merge: true });
    return NextResponse.json({ ok: true, id, status });
  } catch (error: any) {
    const message = error?.message || 'ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHORIZED' ? 401 : 403 });
  }
}
