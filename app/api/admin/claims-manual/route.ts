
import { NextResponse } from 'next/server';
import { db, requireUser } from '@/lib/firebaseAdmin';

const adminEmail = 'liahwang1852@gmail.com';

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const emailAdmin = (user.email || '').toLowerCase().trim();

    if (emailAdmin !== adminEmail) {
      return NextResponse.json(
        { error: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const productoId = Number(body.productoId);
    const goId = String(body.goId || '');
    const slot = String(body.slot || '').trim();
    const joinerEmail = String(body.email || '').toLowerCase().trim();
    const cantidad = Number(body.cantidad);

    if (
      !Number.isSafeInteger(productoId) ||
      productoId <= 0 ||
      !goId ||
      !slot ||
      !joinerEmail ||
      !Number.isInteger(cantidad) ||
      cantidad < 1
    ) {
      return NextResponse.json(
        { error: 'Datos del claim inválidos.' },
        { status: 400 }
      );
    }

    const productoRef = db.collection('productos').doc(String(productoId));

    const resultado = await db.runTransaction(async (transaction) => {
      const productoSnap = await transaction.get(productoRef);

      if (!productoSnap.exists) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      const producto = productoSnap.data() || {};

      if (String(producto.go_id) !== goId) {
        throw new Error('GO_MISMATCH');
      }

      const stockSlots = producto.stock_slots || {};
      const stock = Number(stockSlots[slot] ?? 0);

      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error('INVALID_STOCK');
      }

      const claims = {
        ...(producto.claims_integrantes || {}),
      };

      const actual = claims[slot];
      const porCorreo: Record<string, number> = {};

      if (typeof actual === 'string' && actual.trim()) {
        porCorreo[actual.toLowerCase().trim()] = 1;
      } else if (actual && typeof actual === 'object') {
        Object.entries(actual).forEach(([mail, qty]) => {
          porCorreo[mail.toLowerCase().trim()] = Number(qty) || 0;
        });
      }

      const totalUsado = Object.values(porCorreo).reduce(
        (sum, qty) => sum + qty,
        0
      );

      const disponibles = Math.max(0, stock - totalUsado);

      if (totalUsado + cantidad > stock) {
        throw new Error(`OUT_OF_STOCK:${disponibles}`);
      }

      porCorreo[joinerEmail] =
        (porCorreo[joinerEmail] || 0) + cantidad;

      claims[slot] = porCorreo;

      transaction.update(productoRef, {
        claims_integrantes: claims,
      });

      return {
        disponibles: disponibles - cantidad,
      };
    });

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error: any) {
    const message = error.message || 'ERROR';

    const status =
      message === 'UNAUTHORIZED'
        ? 401
        : message === 'FORBIDDEN'
          ? 403
          : message === 'PRODUCT_NOT_FOUND'
            ? 404
            : 400;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
