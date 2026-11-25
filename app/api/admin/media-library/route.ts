import { NextResponse } from 'next/server';
import { db, requireAdmin } from '@/lib/firebaseAdmin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const clean = (value: unknown, max = 500) => String(value ?? '').trim().slice(0, max);

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snap = await db.collection('media_library').orderBy('created_at', 'desc').limit(500).get();
    return NextResponse.json({ data: snap.docs.map((doc) => ({ ...doc.data(), id: doc.id })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: any) {
    const message = error?.message || 'ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHORIZED' ? 401 : 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const records = Array.isArray(body.records) ? body.records : [];
    if (!records.length || records.length > 20) return NextResponse.json({ error: 'Envía entre 1 y 20 fotografías por tanda.' }, { status: 400 });
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const batch = db.batch();
    const saved: any[] = [];
    for (const item of records) {
      const url = clean(item.url, 1200);
      const publicId = clean(item.publicId, 300);
      if (!cloud || !url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`) || !publicId.startsWith('hyuneatelier/')) {
        return NextResponse.json({ error: 'Una de las imágenes no pertenece a la biblioteca Cloudinary de Hyuneatelier.' }, { status: 400 });
      }
      const ref = db.collection('media_library').doc();
      const row = {
        url, public_id: publicId, file_name: clean(item.fileName, 180), mime_type: clean(item.mimeType, 80),
        assigned_to: ['GO', 'GO_COVER'].includes(body.assignedTo) ? body.assignedTo : 'SHOP', assigned_product_id: clean(body.productId, 80), assigned_product_name: clean(body.productName, 180), created_at: new Date().toISOString(), created_by: clean(admin.email, 180).toLowerCase(),
      };
      batch.create(ref, row);
      saved.push({ id: ref.id, ...row });
    }
    await batch.commit();
    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error: any) {
    const message = error?.message || 'ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHORIZED' ? 401 : 403 });
  }
}
