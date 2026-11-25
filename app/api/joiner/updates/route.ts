import { NextResponse } from 'next/server';
import { db, requireUser } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase();

/**
 * Joiner-only feed. Membership is verified against the existing GO product
 * claims; a client-supplied GO id is never trusted.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const email = normalizeEmail(user.email);
    if (!email) throw new Error('UNAUTHORIZED');

    const tracking = await db.collection('seguimiento_claims')
      .where('user_email', '==', email).get();
    const productMembership = new Map<number, boolean>();
    for (const claimDoc of tracking.docs) {
      const key = String(claimDoc.data().claim_key || '');
      const split = key.indexOf('-');
      if (split > 0) {
        const id = Number(key.slice(0, split));
        if (Number.isSafeInteger(id) && id > 0) {
          const active = claimDoc.data().estado_confirmacion !== 'Cancelado';
          productMembership.set(id, Boolean(productMembership.get(id) || active));
        }
      }
    }

    const goIds = new Set<string>();
    await Promise.all(Array.from(productMembership.entries()).map(async ([productId, isActiveClaim]) => {
      const product = await db.collection('productos').doc(String(productId)).get();
      if (!product.exists) return;
      const data = product.data() || {};
      const goId = String(data.go_id ?? '').trim();
      // seguimiento_claims is the canonical per-Joiner record created by the
      // claim flow and retained for migrated historical claims. Requiring the
      // product's current claims_integrantes map as well hid valid legacy GOs
      // whose imported map is empty or represented in an older format.
      if (goId && isActiveClaim) goIds.add(goId);
    }));

    const ids = Array.from(goIds);
    const updates: any[] = [];
    for (let i = 0; i < ids.length; i += 30) {
      const batch = ids.slice(i, i + 30);
      const snap = await db.collection('operaciones_actualizaciones')
        .where('go_id', 'in', batch).get();
      updates.push(...snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }
    updates.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return NextResponse.json({ data: updates }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error: any) {
    const message = error?.message || 'ERROR';
    return NextResponse.json({ error: message }, {
      status: message === 'UNAUTHORIZED' ? 401 : 403,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}
