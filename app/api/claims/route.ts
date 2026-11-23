import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db, requireUser } from '@/lib/firebaseAdmin';

type ClaimItem = { productId: number; integrante: string; cantidad: number; goTitulo?: string; productoNombre?: string };

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json() as { items?: ClaimItem[]; profile?: Record<string, unknown> };
    const items = body.items || [];
    if (!items.length || items.length > 30) return NextResponse.json({ error: 'Carrito inválido.' }, { status: 400 });
    for (const item of items) {
      if (!Number.isInteger(item.productId) || !item.integrante?.trim() || !Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 20) {
        return NextResponse.json({ error: 'Hay un slot inválido.' }, { status: 400 });
      }
    }
    const email = (user.email || '').toLowerCase().trim();
    if (!email) return NextResponse.json({ error: 'La cuenta no tiene correo verificado.' }, { status: 400 });
    const byProduct = new Map<number, ClaimItem[]>();
    for (const item of items) byProduct.set(item.productId, [...(byProduct.get(item.productId) || []), item]);

    await db.runTransaction(async (tx) => {
      const productRefs = [...byProduct.keys()].map((id) => db.collection('productos').doc(String(id)));
      const snapshots = await tx.getAll(...productRefs);
      const goIds = [...new Set(snapshots.map(s => Number(s.data()?.go_id)))];
      const goRefs = goIds.map(id => db.collection('gos').doc(String(id)));
      const goSnapshots = await tx.getAll(...goRefs);
      const goMap = new Map(goSnapshots.map(g => [Number(g.id), g.data() || {}]));
      const now = new Date().toISOString();
      for (let index = 0; index < snapshots.length; index++) {
        const snap = snapshots[index];
        if (!snap.exists) throw new Error('PRODUCT_NOT_FOUND');
        const product = snap.data() || {};
        const go = goMap.get(Number(product.go_id));
        if (!go || go.status !== 'OPEN') throw new Error('GO_CLOSED');
        const allowedSlots = String(product.lista_slots || '').split(',').map((slot:string) => slot.trim());
        const claims = structuredClone((product.claims_integrantes || {}) as Record<string, Record<string, number>>);
        const stock = (product.stock_slots || {}) as Record<string, number>;
        for (const item of byProduct.get(Number(snap.id)) || []) {
          if (!allowedSlots.includes(item.integrante)) throw new Error('INVALID_SLOT');
          const already = Number(claims[item.integrante]?.[email] || 0);
          const totalClaimed = Object.values(claims[item.integrante] || {}).reduce((sum, value) => sum + Number(value || 0), 0);
          const available = Number(stock[item.integrante] ?? 0) - totalClaimed;
          if (item.cantidad > available + already) throw new Error(`OUT_OF_STOCK:${item.integrante}`);
          claims[item.integrante] ||= {};
          claims[item.integrante][email] = already + item.cantidad;
          const claimId = `${snap.id}-${item.integrante}-${Buffer.from(email).toString('base64url')}`;
          tx.set(db.collection('seguimiento_claims').doc(claimId), {
            claim_key: `${snap.id}-${item.integrante}`, user_email: email,
            go_title: item.goTitulo || '', producto_nombre: item.productoNombre || product.nombre_producto || '',
            integrante: item.integrante, estado_confirmacion: 'Pendiente', estado_pago: 'Sin pagar', created_at: now,
          }, { merge: true });
        }
        tx.update(snap.ref, { claims_integrantes: claims, updated_at: FieldValue.serverTimestamp() });
      }
      if (body.profile) tx.set(db.collection('perfiles_joiners').doc(encodeURIComponent(email)), { ...body.profile, user_email: email }, { merge: true });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    const status = message === 'UNAUTHORIZED' ? 401 : message.startsWith('OUT_OF_STOCK:') ? 409 : message === 'PRODUCT_NOT_FOUND' ? 404 : message === 'GO_CLOSED' ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
