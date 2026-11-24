import { NextResponse } from 'next/server';
import { db, requireAdmin } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();

    const productoId = Number(body.productoId);
    const goId = String(body.goId ?? '').trim();
    const slot = String(body.slot ?? '').trim();
    const joinerEmail = String(body.email ?? '').trim().toLowerCase();
    const cantidad = Number(body.cantidad);

    if (
      !Number.isSafeInteger(productoId) ||
      productoId <= 0 ||
      !goId ||
      !slot ||
      !/^\S+@\S+\.\S+$/.test(joinerEmail) ||
      !Number.isSafeInteger(cantidad) ||
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

      const slotsPermitidos = String(producto.lista_slots || '')
        .split(',')
        .map((value: string) => value.trim())
        .filter(Boolean);

      if (slotsPermitidos.length && !slotsPermitidos.includes(slot)) {
        throw new Error('INVALID_SLOT');
      }

      const stockSlots =
        producto.stock_slots && typeof producto.stock_slots === 'object'
          ? producto.stock_slots
          : {};

      const stock = Number(stockSlots[slot]);

      if (!Number.isSafeInteger(stock) || stock < 0) {
        throw new Error('INVALID_STOCK');
      }

      const claims =
        producto.claims_integrantes &&
        typeof producto.claims_integrantes === 'object'
          ? { ...producto.claims_integrantes }
          : {};

      const actual = claims[slot];
      const porCorreo: Record<string, number> = {};

      if (typeof actual === 'string' && actual.trim()) {
        porCorreo[actual.trim().toLowerCase()] = 1;
      } else if (actual && typeof actual === 'object' && !Array.isArray(actual)) {
        for (const [mail, qty] of Object.entries(actual)) {
          const normalizedMail = mail.trim().toLowerCase();
          const parsedQty = Number(qty);

          if (
            normalizedMail &&
            Number.isSafeInteger(parsedQty) &&
            parsedQty > 0
          ) {
            porCorreo[normalizedMail] = parsedQty;
          }
        }
      }

      const totalUsado = Object.values(porCorreo).reduce(
        (sum, qty) => sum + qty,
        0
      );

      const disponibles = Math.max(0, stock - totalUsado);

      if (totalUsado + cantidad > stock) {
        throw new Error(`OUT_OF_STOCK:${disponibles}`);
      }

      porCorreo[joinerEmail] = (porCorreo[joinerEmail] || 0) + cantidad;
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ERROR';

    const status =
      message === 'UNAUTHORIZED'
        ? 401
        : message === 'FORBIDDEN'
          ? 403
          : message === 'PRODUCT_NOT_FOUND'
            ? 404
            : message.startsWith('OUT_OF_STOCK:')
              ? 409
              : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
