import { NextResponse } from 'next/server';
import { db, requireAdmin } from '@/lib/firebaseAdmin';

type DeleteItem = {
  origen?: string;
  claimKeyBase?: string;
  pedidoId?: number | string;
};

function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function parseGoClaimKey(value: unknown): { productId: number; slot: string } {
  const key = String(value ?? '').trim();
  const separator = key.indexOf('-');

  if (separator <= 0) {
    throw new Error('INVALID_CLAIM_KEY');
  }

  const productId = Number(key.slice(0, separator));
  const slot = key.slice(separator + 1).trim();

  if (!Number.isSafeInteger(productId) || productId <= 0 || !slot) {
    throw new Error('INVALID_CLAIM_KEY');
  }

  return { productId, slot };
}

function reservedForSlot(value: unknown): number {
  if (typeof value === 'string') {
    return value.trim() ? 1 : 0;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 0;
  }

  let total = 0;

  for (const quantity of Object.values(value as Record<string, unknown>)) {
    const parsed = Number(quantity);

    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new Error('INVALID_CLAIMS_DATA');
    }

    total += parsed;
  }

  return total;
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const action = String(body.action ?? '');

    if (action === 'update-stock') {
      const productoId = Number(body.productoId);
      const incoming = body.stock_slots;

      if (
        !Number.isSafeInteger(productoId) ||
        productoId <= 0 ||
        !incoming ||
        typeof incoming !== 'object' ||
        Array.isArray(incoming)
      ) {
        return NextResponse.json(
          { error: 'Datos de stock inválidos.' },
          { status: 400 }
        );
      }

      const newValues: Record<string, number> = {};

      for (const [slotRaw, value] of Object.entries(incoming)) {
        const slot = slotRaw.trim();
        const quantity = Number(value);

        if (!slot || !Number.isSafeInteger(quantity) || quantity < 0) {
          return NextResponse.json(
            { error: `INVALID_STOCK:${slotRaw}` },
            { status: 400 }
          );
        }

        newValues[slot] = quantity;
      }

      if (Object.keys(newValues).length === 0) {
        return NextResponse.json(
          { error: 'No hay valores de stock para guardar.' },
          { status: 400 }
        );
      }

      const productRef = db.collection('productos').doc(String(productoId));

      const data = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(productRef);

        if (!snapshot.exists) {
          throw new Error('PRODUCT_NOT_FOUND');
        }

        const product = snapshot.data() || {};
        const currentStock =
          product.stock_slots &&
          typeof product.stock_slots === 'object' &&
          !Array.isArray(product.stock_slots)
            ? product.stock_slots
            : {};

        const claims =
          product.claims_integrantes &&
          typeof product.claims_integrantes === 'object' &&
          !Array.isArray(product.claims_integrantes)
            ? product.claims_integrantes
            : {};

        const mergedStock: Record<string, number> = {
          ...currentStock,
        };

        for (const [slot, quantity] of Object.entries(newValues)) {
          const reserved = reservedForSlot(claims[slot]);

          if (quantity < reserved) {
            throw new Error(`STOCK_BELOW_CLAIMS:${slot}:${reserved}`);
          }

          mergedStock[slot] = quantity;
        }

        transaction.update(productRef, {
          stock_slots: mergedStock,
        });

        return { stock_slots: mergedStock };
      });

      return NextResponse.json({ success: true, data });
    }

    if (action === 'delete-items') {
      const email = normalizeEmail(body.email);
      const items = body.items as DeleteItem[];

      if (
        !/^\S+@\S+\.\S+$/.test(email) ||
        !Array.isArray(items) ||
        items.length === 0 ||
        items.length > 120
      ) {
        return NextResponse.json(
          { error: 'Datos de eliminación inválidos.' },
          { status: 400 }
        );
      }

      const productSlots = new Map<number, Set<string>>();
      const trackingRefs = new Map<string, any>();
      const orderRefs = new Map<string, any>();

      for (const item of items) {
        if (item?.origen === 'GO') {
          const { productId, slot } = parseGoClaimKey(item.claimKeyBase);

          if (!productSlots.has(productId)) {
            productSlots.set(productId, new Set());
          }
          productSlots.get(productId)!.add(slot);

          const trackingId =
            `${String(item.claimKeyBase)}-${Buffer.from(email).toString('base64url')}`;
          trackingRefs.set(
            trackingId,
            db.collection('seguimiento_claims').doc(trackingId)
          );
        } else if (item?.origen === 'SHOP') {
          const pedidoId = Number(item.pedidoId);

          if (!Number.isSafeInteger(pedidoId) || pedidoId <= 0) {
            throw new Error('INVALID_ORDER_ID');
          }

          orderRefs.set(
            String(pedidoId),
            db.collection('pedidos').doc(String(pedidoId))
          );
        } else {
          throw new Error('INVALID_ITEM_ORIGIN');
        }
      }

      const productRefs = [...productSlots.keys()].map((id) =>
        db.collection('productos').doc(String(id))
      );
      const allRefs = [
        ...productRefs,
        ...trackingRefs.values(),
        ...orderRefs.values(),
      ];

      const result = await db.runTransaction(async (transaction) => {
        const snapshots = allRefs.length
          ? await transaction.getAll(...allRefs)
          : [];

        const snapshotByPath = new Map(
          snapshots.map((snapshot) => [snapshot.ref.path, snapshot])
        );

        const productUpdates: Array<{
          ref: any;
          claims: Record<string, unknown>;
        }> = [];

        for (const [productId, slots] of productSlots) {
          const ref = db.collection('productos').doc(String(productId));
          const snapshot = snapshotByPath.get(ref.path);

          if (!snapshot?.exists) {
            throw new Error('PRODUCT_NOT_FOUND');
          }

          const product = snapshot.data() || {};
          const claims =
            product.claims_integrantes &&
            typeof product.claims_integrantes === 'object' &&
            !Array.isArray(product.claims_integrantes)
              ? { ...product.claims_integrantes }
              : {};

          let changed = false;

          for (const slot of slots) {
            const current = claims[slot];

            if (typeof current === 'string') {
              if (current.trim().toLowerCase() === email) {
                delete claims[slot];
                changed = true;
              }
            } else if (
              current &&
              typeof current === 'object' &&
              !Array.isArray(current)
            ) {
              const users = { ...(current as Record<string, unknown>) };
              const matchingKey = Object.keys(users).find(
                (key) => key.trim().toLowerCase() === email
              );

              if (matchingKey) {
                delete users[matchingKey];

                if (Object.keys(users).length === 0) {
                  delete claims[slot];
                } else {
                  claims[slot] = users;
                }

                changed = true;
              }
            }
          }

          if (changed) {
            productUpdates.push({ ref, claims });
          }
        }

        const ordersToDelete: any[] = [];

        for (const ref of orderRefs.values()) {
          const snapshot = snapshotByPath.get(ref.path);

          if (!snapshot?.exists) {
            throw new Error('ORDER_NOT_FOUND');
          }

          const order = snapshot.data() || {};

          if (
            normalizeEmail(order.user_email) !== email ||
            String(order.tipo_servicio || '').toUpperCase() !== 'SHOP'
          ) {
            throw new Error('ORDER_NOT_OWNED_BY_JOINER');
          }

          ordersToDelete.push(ref);
        }

        // Todas las lecturas se completan antes de comenzar las escrituras.
        for (const update of productUpdates) {
          transaction.update(update.ref, {
            claims_integrantes: update.claims,
          });
        }

        for (const ref of trackingRefs.values()) {
          transaction.delete(ref);
        }

        for (const ref of ordersToDelete) {
          transaction.delete(ref);
        }

        return {
          productsUpdated: productUpdates.length,
          trackingDeleted: trackingRefs.size,
          ordersDeleted: ordersToDelete.length,
        };
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { error: 'Acción no permitida.' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ERROR';

    const status =
      message === 'UNAUTHORIZED'
        ? 401
        : message === 'FORBIDDEN'
          ? 403
          : message === 'PRODUCT_NOT_FOUND' || message === 'ORDER_NOT_FOUND'
            ? 404
            : message.startsWith('STOCK_BELOW_CLAIMS:')
              ? 409
              : message === 'ORDER_NOT_OWNED_BY_JOINER'
                ? 403
                : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
