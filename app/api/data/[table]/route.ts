
import { NextResponse } from 'next/server';
import { db, requireUser, requireAdmin } from '@/lib/firebaseAdmin';

const allowed = new Set([
  'gos',
  'productos',
  'seguimiento_claims',
  'perfiles_joiners',
  'integrantes_fotos',
  'tienda_productos',
  'pedidos',
  'solicitudes_envio',
  'wishlist_joiners',
]);

const publicRead = new Set([
  'gos',
  'productos',
  'tienda_productos',
  'integrantes_fotos',
]);

const adminEmail = 'liahwang1852@gmail.com';

export const revalidate = 20;

const normalizeName = (value: any) =>
  String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

const parseJsonField = (value: any, fallback: any) => {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const docId = (table: string, row: any) => {
  if (row.id !== undefined && row.id !== null) {
    return String(row.id);
  }

  if (table === 'perfiles_joiners') {
    return encodeURIComponent(String(row.user_email || ''));
  }

  if (table === 'seguimiento_claims') {
    return `${row.claim_key || 'claim'}-${Buffer.from(
      String(row.user_email || 'unknown')
    ).toString('base64url')}`;
  }

  if (table === 'wishlist_joiners') {
    return `${row.user_email || 'user'}-${row.producto_id || 'item'}`;
  }

  if (table === 'integrantes_fotos') {
    const nombre = normalizeName(row.nombre);
    return `nombre-${encodeURIComponent(nombre)}`;
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

async function access(request: Request, table: string, write: boolean) {
  if (!allowed.has(table)) {
    throw new Error('TABLE_NOT_ALLOWED');
  }

  const token = request.headers.get('authorization');

  if (
    !write &&
    publicRead.has(table) &&
    (table !== 'productos' || !token)
  ) {
    return { email: null, admin: false };
  }

  const user = await requireUser(request);
  const email = (user.email || '').toLowerCase();
  const admin = email === adminEmail;

  if (
    write &&
    !admin &&
    ![
      'perfiles_joiners',
      'wishlist_joiners',
      'solicitudes_envio',
      'pedidos',
    ].includes(table)
  ) {
    throw new Error('FORBIDDEN');
  }

  if (
    !write &&
    !admin &&
    !publicRead.has(table) &&
    ![
      'perfiles_joiners',
      'seguimiento_claims',
      'pedidos',
      'solicitudes_envio',
      'wishlist_joiners',
    ].includes(table)
  ) {
    throw new Error('FORBIDDEN');
  }

  return { email, admin };
}

export async function GET(
  request: Request,
  { params }: { params: { table: string } }
) {
  try {
    const table = params.table;
    const { email, admin } = await access(request, table, false);
    const url = new URL(request.url);

    const filters = JSON.parse(
      url.searchParams.get('filters') || '[]'
    ) as Array<[string, any, string?]>;

    let query: any = db.collection(table);

    if (!admin && email && !publicRead.has(table)) {
      query = query.where('user_email', '==', email);
    }

    for (const [field, value, op] of filters) {
      query = query.where(field, op === 'in' ? 'in' : '==', value);
    }

    const snap = await query.get();

    let rows = snap.docs.map((d: any) => ({
      id: Number.isNaN(Number(d.id)) ? d.id : Number(d.id),
      ...d.data(),
    }));

    // Legacy imports kept some JSON columns as strings. Normalize them at the
    // API boundary so admin screens and customer pages receive stable objects.
    if (table === 'productos') {
      rows = rows.map((row: any) => ({
        ...row,
        claims_integrantes: parseJsonField(row.claims_integrantes, {}),
        stock_slots: parseJsonField(row.stock_slots, {}),
      }));
    }
    if (table === 'tienda_productos') {
      rows = rows.map((row: any) => ({
        ...row,
        variantes: parseJsonField(row.variantes, []),
        fotos_extra: parseJsonField(row.fotos_extra, []),
      }));
    }

    if (table === 'productos') {
      const gs = await db.collection('gos').get();

      const map = new Map(
        gs.docs.map((d: any) => [
          Number(d.id),
          { id: Number(d.id), ...d.data() },
        ])
      );

      rows = rows.map((r: any) => {
        const raw =
          r.claims_integrantes &&
          typeof r.claims_integrantes === 'object'
            ? r.claims_integrantes
            : {};

        const claims = admin
          ? raw
          : Object.fromEntries(
              Object.entries(raw).flatMap(([slot, users]: [string, any]) => {
                if (typeof users === 'string') {
                  return normalizeName(users) === normalizeName(email)
                    ? [[slot, { [email]: 1 }]]
                    : [];
                }
                if (!users || typeof users !== 'object' || Array.isArray(users)) return [];
                const ownEntry = Object.entries(users).find(([mail, quantity]) =>
                  normalizeName(mail) === normalizeName(email) && Number(quantity) > 0
                );
                return ownEntry ? [[slot, { [email]: Number(ownEntry[1]) }]] : [];
              })
            );

        return {
          ...r,
          claims_integrantes: claims,
          gos: map.get(Number(r.go_id)) || null,
        };
      });
    }

    const ord = url.searchParams.get('order');

    if (ord) {
      const [k, asc] = JSON.parse(ord);

      rows.sort(
        (a: any, b: any) =>
          (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) *
          (asc ? 1 : -1)
      );
    }

    return NextResponse.json(
      { data: rows },
      {
        headers: {
          'Cache-Control': publicRead.has(table)
            ? 'public, s-maxage=20, stale-while-revalidate=60'
            : 'private, no-store',
        },
      }
    );
  } catch (e: any) {
    const m = e.message || 'ERROR';

    return NextResponse.json(
      { error: m },
      {
        status:
          m === 'UNAUTHORIZED'
            ? 401
            : m === 'FORBIDDEN'
              ? 403
              : 400,
      }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { table: string } }
) {
  return mutate(request, params.table, 'POST');
}

export async function PATCH(
  request: Request,
  { params }: { params: { table: string } }
) {
  return mutate(request, params.table, 'PATCH');
}

export async function DELETE(
  request: Request,
  { params }: { params: { table: string } }
) {
  return mutate(request, params.table, 'DELETE');
}

async function mutate(
  request: Request,
  table: string,
  method: string
) {
  try {
    const { email, admin } = await access(request, table, true);

    const body = await request.json();
    const filters = body.filters || [];
    const records = body.records || [];

    if (
      !admin &&
      table === 'pedidos' &&
      !(
        method === 'PATCH' &&
        Object.keys(body.values || {}).length === 1 &&
        body.values?.estado_envio === 'Envío solicitado'
      )
    ) {
      return NextResponse.json(
        { error: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (
      !admin &&
      table === 'solicitudes_envio' &&
      method !== 'POST'
    ) {
      return NextResponse.json(
        { error: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (
      !admin &&
      table === 'wishlist_joiners' &&
      method !== 'POST'
    ) {
      return NextResponse.json(
        { error: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (method === 'POST') {
      if (!Array.isArray(records) || records.length > 100) {
        return NextResponse.json(
          { error: 'Invalid records' },
          { status: 400 }
        );
      }

      // Guardado especial de fotos de integrantes.
      // Busca también documentos antiguos con IDs aleatorios.
      if (table === 'integrantes_fotos') {
        if (!admin) {
          return NextResponse.json(
            { error: 'FORBIDDEN' },
            { status: 403 }
          );
        }

        const existingSnap = await db
          .collection('integrantes_fotos')
          .get();

        const existingByName = new Map<string, any[]>();

        for (const doc of existingSnap.docs) {
          const nombreExistente = normalizeName(
            doc.data().nombre
          );

          if (!nombreExistente) continue;

          const current = existingByName.get(nombreExistente) || [];
          current.push(doc.ref);
          existingByName.set(nombreExistente, current);
        }

        const operations = new Map<string, {
          ref: any;
          data: any;
        }>();

        for (const row of records) {
          if (!row || !normalizeName(row.nombre)) {
            return NextResponse.json(
              { error: 'El nombre del integrante es obligatorio.' },
              { status: 400 }
            );
          }

          const nombreNormalizado = normalizeName(row.nombre);
          const existingRefs =
            existingByName.get(nombreNormalizado) || [];

          const refs =
            existingRefs.length > 0
              ? existingRefs
              : [
                  db
                    .collection('integrantes_fotos')
                    .doc(docId('integrantes_fotos', row)),
                ];

          const data = {
            grupo: String(row.grupo || '').toUpperCase().trim(),
            nombre: String(row.nombre).trim(),
            imagen_url: row.imagen_url || null,
          };

          for (const ref of refs) {
            operations.set(ref.path, { ref, data });
          }
        }

        const pending = Array.from(operations.values());

        // Firestore admite un máximo de 500 operaciones por batch.
        for (let i = 0; i < pending.length; i += 450) {
          const batch = db.batch();
          const chunk = pending.slice(i, i + 450);

          for (const operation of chunk) {
            batch.set(operation.ref, operation.data, {
              merge: true,
            });
          }

          await batch.commit();
        }

        return NextResponse.json({ data: records });
      }

      const batch = db.batch();

      for (let index = 0; index < records.length; index++) {
        const row = records[index];
        if (
          !admin &&
          [
            'perfiles_joiners',
            'wishlist_joiners',
            'solicitudes_envio',
          ].includes(table) &&
          (
            !row.user_email ||
            String(row.user_email).toLowerCase() !== email
          )
        ) {
          return NextResponse.json(
            { error: 'FORBIDDEN' },
            { status: 403 }
          );
        }

        if (
          row.id === undefined &&
          !['perfiles_joiners', 'seguimiento_claims'].includes(table)
        ) {
          row.id = Date.now() + index;
        }

        const ref = db
          .collection(table)
          .doc(docId(table, row));

        batch.set(ref, row, {
          merge: body.action === 'upsert',
        });
      }

      await batch.commit();

      return NextResponse.json({ data: records });
    }

    let snap = await db.collection(table).get();

    const sameValue = (a: any, b: any) => {
  if (a === b) return true;

  if (a === null || a === undefined || a === '') return false;
  if (b === null || b === undefined || b === '') return false;

  const numberA = Number(a);
  const numberB = Number(b);

  return (
    Number.isFinite(numberA) &&
    Number.isFinite(numberB) &&
    numberA === numberB
  );
};

let docs = snap.docs.filter((d: any) =>
  filters.every(([k, v, op]: [string, any, string?]) =>
    op === 'in'
      ? Array.isArray(v) && v.some((item) => sameValue(d.get(k), item))
      : sameValue(d.get(k), v)
  )
);

    if (!admin) {
      docs = docs.filter(
        (d: any) =>
          String(d.get('user_email') || '').toLowerCase() === email
      );
    }

    if (method === 'PATCH') {
      const batch = db.batch();

      for (const d of docs) {
        batch.set(d.ref, body.values || {}, {
          merge: true,
        });
      }

      await batch.commit();

      return NextResponse.json({
        data: { count: docs.length },
      });
    }

    const batch = db.batch();

    for (const d of docs) {
      batch.delete(d.ref);
    }

    await batch.commit();

    return NextResponse.json({
      data: { count: docs.length },
    });
  } catch (e: any) {
    const m = e.message || 'ERROR';

    return NextResponse.json(
      { error: m },
      {
        status:
          m === 'UNAUTHORIZED'
            ? 401
            : m === 'FORBIDDEN'
              ? 403
              : 400,
      }
    );
  }
}
