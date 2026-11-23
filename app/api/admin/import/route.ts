import { NextResponse } from 'next/server';
import { db, requireAdmin } from '@/lib/firebaseAdmin';

export const maxDuration = 60;
const allowed = new Set(['gos','productos','seguimiento_claims','perfiles_joiners','integrantes_fotos','tienda_productos','pedidos','solicitudes_envio','wishlist_joiners']);

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json() as { collection?: string; records?: Array<Record<string, unknown>> };
    const collection = body.collection || '';
    const records = body.records || [];
    if (!allowed.has(collection) || !Array.isArray(records) || records.length > 400) {
      return NextResponse.json({ error: 'Colección o lote no permitido.' }, { status: 400 });
    }
    let batch = db.batch();
    let count = 0;
    for (const record of records) {
      const rawId = record.id ?? (collection === 'seguimiento_claims' ? `${record.claim_key || 'claim'}-${record.user_email || 'unknown'}` : record.user_email ?? record.claim_key);
      if (rawId === undefined || rawId === null || String(rawId).trim() === '') continue;
      const ref = db.collection(collection).doc(String(rawId));
      batch.set(ref, record, { merge: true });
      count++;
      if (count % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    if (count % 400) await batch.commit();
    return NextResponse.json({ ok: true, imported: count, collection });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHORIZED' ? 401 : 403 });
  }
}
