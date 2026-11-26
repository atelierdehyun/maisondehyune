import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const revalidate = 60;

export async function GET() {
  try {
    const [gosSnap, productsSnap] = await Promise.all([
      db.collection('gos').get(),
      db.collection('productos').limit(500).get(),
    ]);

    const gos = gosSnap.docs.map((d) => ({ id: Number(d.id), ...d.data() }));
    const productos = productsSnap.docs.map((d) => {
      const row: any = { id: Number(d.id), ...d.data() };
      const raw = row.claims_integrantes && typeof row.claims_integrantes === 'object' ? row.claims_integrantes : {};
      row.claims_integrantes = Object.fromEntries(
        Object.entries(raw).map(([slot, users]: [string, any]) => [
          slot,
          Object.fromEntries(
            Object.values(users || {}).map((qty: any, index: number) => [`joiner_${index + 1}`, qty])
          ),
        ])
      );
      return row;
    });

    return NextResponse.json(
      { gos, productos },
      {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      }
    );
  } catch (error) {
    console.error('GET /api/public/gos', error);
    return NextResponse.json({ error: 'No se pudieron cargar los GOs.' }, { status: 503 });
  }
}
