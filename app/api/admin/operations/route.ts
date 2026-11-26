import { NextResponse } from 'next/server';
import { db, requireAdmin } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const names = [
  'gos', 'productos', 'tienda_productos',
  'operaciones_pagos', 'operaciones_pedidos', 'operaciones_actualizaciones', 'comprobantes_pago',
];
const clean = (value: unknown, max = 500) => String(value ?? '').trim().slice(0, max);
const emailOf = (value: unknown) => clean(value, 180).toLowerCase();
const money = (value: unknown) => Math.round(Number(value) * 100) / 100;
const parseObject = (value: any) => { if (value && typeof value === 'object' && !Array.isArray(value)) return value; if (typeof value !== 'string' || !value.trim()) return {}; try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } };
const parseArray = (value: any): any[] => { if (Array.isArray(value)) return value; if (typeof value !== 'string' || !value.trim()) return []; try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);

    if (url.searchParams.get('summary') === '1') {
      const count = async (collection: string, field?: string, value?: unknown) => {
        let query: any = db.collection(collection);
        if (field) query = query.where(field, '==', value);
        const result = await query.count().get();
        return Number(result.data().count || 0);
      };
      const [gosCount, productosCount, shopProductsCount, pendingProofsA,
        pendingProofsB, shippingRequestsCount, openOrdersCount] = await Promise.all([
        count('gos'), count('productos'), count('tienda_productos'),
        count('comprobantes_pago', 'status', 'Pendiente de revisión'),
        count('comprobantes_pago', 'status', 'Pendiente'),
        count('solicitudes_envio'), count('pedidos'),
      ]);
      return NextResponse.json({ data: {
        gosCount, productosCount, shopProductsCount,
        pendingProofsCount: pendingProofsA + pendingProofsB,
        shippingRequestsCount, openOrdersCount,
      } }, { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' } });
    }

    const requested = (url.searchParams.get('collections') || names.join(','))
      .split(',').filter((name) => names.includes(name));
    const maxRows = Math.min(200, Math.max(10, Number(url.searchParams.get('limit')) || 100));
    const data: Record<string, any[]> = {};

    await Promise.all(requested.map(async (name) => {
      const snap = await db.collection(name).limit(maxRows).get();
      data[name] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }));
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, max-age=10' } });
  } catch (error: any) {
    const message = error?.message || 'ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHORIZED' ? 401 : 403 });
  }
}
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const kind = clean(body.kind, 30);
    const now = new Date().toISOString();
    const actor = emailOf(admin.email);
    let collection = '';
    let row: Record<string, any> = {};

    if (kind === 'payment') {
      const scope = body.scope === 'SHOP' ? 'SHOP' : 'GO';
      const amount = money(body.amount);
      const joinerEmail = emailOf(body.joinerEmail);
      const goId = scope === 'GO' ? clean(body.goId, 80) : null;
      if (!joinerEmail.includes('@')) throw new Error('INVALID_JOINER');
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) throw new Error('INVALID_AMOUNT');
      if (scope === 'GO' && !goId) throw new Error('GO_REQUIRED');

      await db.runTransaction(async (tx) => {
        const allocations: Array<{ ref: any; current: number; due: number; kind: 'GO' | 'SHOP'; meta?: Record<string, any>; createdAt?: string }> = [];
        if (scope === 'GO') {
          const goIdFilters: Array<string | number> = [String(goId)];
          if (!Number.isNaN(Number(goId))) goIdFilters.push(Number(goId));

          const productsQuery = db.collection('productos').where('go_id', 'in', goIdFilters);
          const productsSnap = await tx.get(productsQuery);
          const candidates: Array<{ ref: any; claimKey: string; slot: string; product: any; quantity: number }> = [];
          for (const productDoc of productsSnap.docs) {
            const product = productDoc.data() || {};
            if (String(product.go_id) !== String(goId)) continue;
            const claimsMap = parseObject(product.claims_integrantes);
            for (const [slot, rawClaim] of Object.entries(claimsMap)) {
              let quantity = 0;
              if (typeof rawClaim === 'string') {
                quantity = emailOf(rawClaim) === joinerEmail ? 1 : 0;
              } else if (rawClaim && typeof rawClaim === 'object' && !Array.isArray(rawClaim)) {
                const matchingEmail = Object.keys(rawClaim as Record<string, unknown>).find((mail) => emailOf(mail) === joinerEmail);
                quantity = matchingEmail ? Number((rawClaim as Record<string, unknown>)[matchingEmail] || 0) : 0;
              }
              if (quantity <= 0) continue;
              const claimKey = `${productDoc.id}-${slot}`;
              const trackingId = `${claimKey}-${Buffer.from(joinerEmail).toString('base64url')}`;
              candidates.push({ ref: db.collection('seguimiento_claims').doc(trackingId), claimKey, slot, product, quantity });
            }
          }
          const trackingSnaps = candidates.length ? await tx.getAll(...candidates.map((item) => item.ref)) : [];
          for (let index = 0; index < candidates.length; index++) {
            const candidate = candidates[index];
            const trackingSnap = trackingSnaps[index];
            const tracking = trackingSnap.exists ? trackingSnap.data() || {} : {};
            if (tracking.estado_confirmacion === 'Cancelado' || tracking.estado_pago === 'Pagado') continue;
            const current = money(tracking.monto_abonado || 0);
            const due = Math.max(0, money(Number(candidate.product.precio || 0) * candidate.quantity) - current);
            if (due > 0) allocations.push({ ref: candidate.ref, current, due, kind: 'GO', createdAt: String(tracking.created_at || candidate.product.created_at || ''), meta: { claim_key: candidate.claimKey, user_email: joinerEmail, integrante: candidate.slot, producto_nombre: candidate.product.nombre_producto || '' } });
          }
        } else {
          const orderQuery = db.collection('pedidos').where('user_email', '==', joinerEmail);
          const orderSnap = await tx.get(orderQuery);
          for (const doc of orderSnap.docs) {
            const order = doc.data();
            if (String(order.tipo_servicio || '').toUpperCase() !== 'SHOP') continue;
            if (order.estado_confirmacion === 'Cancelado' || order.estado_pago === 'Pagado') continue;
            const due = Math.max(0, money(order.total_pagar || 0) - money(order.monto_abonado || 0));
            if (due > 0) allocations.push({ ref: doc.ref, current: money(order.monto_abonado || 0), due, kind: 'SHOP', createdAt: String(order.created_at || '') });
          }
        }
        allocations.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') || String(a.ref.id).localeCompare(String(b.ref.id)));
        const outstanding = money(allocations.reduce((sum, item) => sum + item.due, 0));
        if (!allocations.length) throw new Error('NO_OUTSTANDING_BALANCE');
        if (amount - outstanding > 0.005) throw new Error('PAYMENT_EXCEEDS_BALANCE');
        const proofsSnap = await tx.get(db.collection('comprobantes_pago').where('owner_email', '==', joinerEmail));
        let expectedGoTitle = '';
        if (scope === 'GO') {
          const goSnap = await tx.get(db.collection('gos').doc(String(goId)));
          expectedGoTitle = String(goSnap.data()?.title || '').trim();
        }
        const matchingProof = proofsSnap.docs
          .map((doc: any) => ({ id: doc.id, ref: doc.ref, ...doc.data() }))
          .filter((proof: any) => ['Pendiente de revisión', 'Verificado'].includes(proof.status) && proof.scope === scope && (scope !== 'GO' || String(proof.go_title || '').trim() === expectedGoTitle))
          .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
        let remaining = amount;
        for (const item of allocations) {
          if (remaining <= 0) break;
          const applied = Math.min(item.due, remaining);
          const nextPaid = money(item.current + applied);
          const values: Record<string, any> = { monto_abonado: nextPaid };
          if (nextPaid + 0.005 >= item.current + item.due) { values.estado_pago = 'Pagado'; values.fecha_pago = now.slice(0, 10); }
          tx.set(item.ref, { ...(item.meta || {}), ...values }, { merge: true });
          remaining = money(remaining - applied);
        }
        const paymentRef = db.collection('operaciones_pagos').doc();
        const payment = {
          scope, go_id: goId, joiner_email: joinerEmail, amount, currency: 'USD',
          method: clean(body.method || 'Transferencia', 40), reference: clean(body.reference, 160),
          note: clean(body.note, 1000), proof_url: null, proof_id: matchingProof?.id || null, proof_status: matchingProof ? 'received' : 'not_uploaded',
          created_at: now, created_by: actor,
        };
        tx.create(paymentRef, payment);
        if (matchingProof) tx.set(matchingProof.ref, { status: 'Asociado a pago', associated_payment_id: paymentRef.id, associated_at: now }, { merge: true });
        row = { id: paymentRef.id, ...payment };
      });
      collection = 'operaciones_pagos';
    } else if (kind === 'order') {
      const scope = body.scope === 'SHOP' ? 'SHOP' : 'GO';
      const joinerEmail = emailOf(body.joinerEmail);
      const title = clean(body.title, 180);
      const quantity = Math.floor(Number(body.quantity));
      const unitPrice = money(body.unitPrice);
      const goId = scope === 'GO' ? clean(body.goId, 80) : null;
      const slot = clean(body.slot, 100);
      const productId = Number(body.productId);
      const shopProductId = Number(body.shopProductId);
      const variantName = clean(body.variantName, 160);
      if (!joinerEmail.includes('@') || !title) throw new Error('ORDER_FIELDS_REQUIRED');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('INVALID_ORDER_AMOUNT');
      if (scope === 'GO' && (!goId || !Number.isSafeInteger(productId) || productId <= 0 || !slot)) throw new Error('GO_ORDER_FIELDS_REQUIRED');
      if (scope === 'SHOP' && (!Number.isSafeInteger(shopProductId) || shopProductId <= 0)) throw new Error('SHOP_ORDER_FIELDS_REQUIRED');

      const logRef = db.collection('operaciones_pedidos').doc();
      const baseLog = {
        scope, go_id: goId, joiner_email: joinerEmail, title, slot,
        slot_normalized: slot.toLocaleLowerCase(), quantity, unit_price: unitPrice,
        total: money(quantity * unitPrice), source: clean(body.source || 'WhatsApp', 30),
        status: 'Registrado', note: clean(body.note, 1000), created_at: now, created_by: actor,
      };
      if (scope === 'GO') {
        await db.runTransaction(async (tx) => {
          const productRef = db.collection('productos').doc(String(productId));
          const productSnap = await tx.get(productRef);
          if (!productSnap.exists) throw new Error('PRODUCT_NOT_FOUND');
          const product = productSnap.data() || {};
          if (String(product.go_id) !== goId) throw new Error('PRODUCT_GO_MISMATCH');
          const allowedSlots = String(product.lista_slots || '').split(',').map((value: string) => value.trim().toLocaleLowerCase()).filter(Boolean);
          if (!allowedSlots.includes(slot.toLocaleLowerCase())) throw new Error('INVALID_SLOT');
          const claims = structuredClone(parseObject(product.claims_integrantes) as Record<string, any>);
          const rawCurrentSlot = claims[slot] || {};
          const currentSlot: Record<string, number> = typeof rawCurrentSlot === 'string' ? { [emailOf(rawCurrentSlot)]: 1 } : rawCurrentSlot;
          const alreadyByOther = Object.entries(currentSlot).some(([mail, qty]) => emailOf(mail) !== joinerEmail && Number(qty) > 0);
          if (alreadyByOther) throw new Error('SLOT_ALREADY_ASSIGNED');
          const existingQuantity = Number(currentSlot[joinerEmail] || 0);
          const stockSlots = parseObject(product.stock_slots);
          const stockForSlot = Number(stockSlots[slot] ?? product.cantidad_disponible ?? 0);
          if (existingQuantity + quantity > stockForSlot) throw new Error('OUT_OF_STOCK');
          claims[slot] = { ...currentSlot, [joinerEmail]: existingQuantity + quantity };
          const trackingId = `${productId}-${slot}-${Buffer.from(joinerEmail).toString('base64url')}`;
          const trackingRef = db.collection('seguimiento_claims').doc(trackingId);
          const previousTracking = await tx.get(trackingRef);
          const previousData = previousTracking.exists ? previousTracking.data() || {} : {};
          const canonicalPrice = money(product.precio || 0);
          const previousPaid = money(previousData.monto_abonado || 0);
          tx.set(productRef, { claims_integrantes: claims, updated_at: now }, { merge: true });
          tx.set(trackingRef, {
            claim_key: `${productId}-${slot}`, user_email: joinerEmail,
            go_title: clean(body.goTitle || previousData.go_title || '', 180), producto_nombre: title,
            integrante: slot, estado_confirmacion: previousData.estado_confirmacion || 'Pendiente',
            estado_pago: previousPaid + 0.005 >= canonicalPrice * (existingQuantity + quantity) ? 'Pagado' : 'Sin pagar',
            monto_abonado: previousPaid, created_at: previousData.created_at || now, updated_at: now, source: 'admin_manual',
          }, { merge: true });
          tx.create(logRef, { ...baseLog, unit_price: canonicalPrice, total: money(canonicalPrice * quantity), product_id: productId });
        });
      } else {
        const orderId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
        const orderRef = db.collection('pedidos').doc(String(orderId));
        const shopProductRef = db.collection('tienda_productos').doc(String(shopProductId));
        await db.runTransaction(async (tx) => {
          const productSnap = await tx.get(shopProductRef);
          if (!productSnap.exists) throw new Error('SHOP_PRODUCT_NOT_FOUND');
          const product = productSnap.data() || {};
          const variants = parseArray(product.variantes);
          let canonicalPrice = money(product.precio || 0);
          let canonicalTitle = String(product.nombre_producto || title);
          let remainingStock = 0;
          if (variants.length) {
            const variant = variants.find((item: any) => String(item.nombre) === variantName);
            if (!variant) throw new Error('SHOP_VARIANT_REQUIRED');
            if (Number(variant.stock || 0) < quantity) throw new Error('OUT_OF_STOCK');
            canonicalPrice = money(variant.precio || 0);
            const nextVariants = variants.map((item: any) => item === variant ? { ...item, stock: Number(item.stock || 0) - quantity } : item);
            remainingStock = nextVariants.reduce((sum: number, item: any) => sum + Number(item.stock || 0), 0);
            tx.set(shopProductRef, { variantes: nextVariants, cantidad_disponible: remainingStock, estado_pago: remainingStock === 0 ? 'SOLD OUT' : product.estado_pago }, { merge: true });
            canonicalTitle += ` [${variantName}]`;
          } else {
            if (Number(product.cantidad_disponible || 0) < quantity) throw new Error('OUT_OF_STOCK');
            const currentStock = Number(product.cantidad_disponible || 0);
            remainingStock = currentStock - quantity;
            tx.set(shopProductRef, { cantidad_disponible: remainingStock, estado_pago: remainingStock === 0 ? 'SOLD OUT' : product.estado_pago }, { merge: true });
          }
          const total = money(quantity * canonicalPrice);
          const order = {
            id: orderId, user_email: joinerEmail, tipo_servicio: 'SHOP',
            producto_nombre: `${quantity}x ${canonicalTitle}`, detalles: clean(body.note, 1000),
            total_pagar: total, monto_abonado: 0,
            estado_pago: 'Sin pagar', estado_confirmacion: 'Confirmado', estado_envio: 'En bodega',
            imagen_producto: clean(product.imagen_producto || '', 1000), created_at: now, source: 'admin_manual',
          };
          tx.create(orderRef, order);
          tx.create(logRef, { ...baseLog, title: canonicalTitle, unit_price: canonicalPrice, total, product_id: shopProductId, variant_name: variantName || null });
          row = { ...baseLog, title: canonicalTitle, unit_price: canonicalPrice, total, product_id: shopProductId, id: logRef.id };
        });
      }
      collection = 'operaciones_pedidos';
      if (scope === 'GO') row = { ...baseLog, id: logRef.id };
    } else if (kind === 'update') {
      const goId = clean(body.goId, 80);
      const title = clean(body.title, 160);
      const message = clean(body.message, 5000);
      if (!goId || !title || !message) throw new Error('UPDATE_FIELDS_REQUIRED');
      collection = 'operaciones_actualizaciones';
      row = {
        go_id: goId, title, message, status: clean(body.status || 'Información', 40),
        visibility: 'joined_only', created_at: now, created_by: actor,
      };
    } else {
      throw new Error('INVALID_OPERATION');
    }

    if (kind === 'payment') return NextResponse.json({ data: row }, { status: 201 });
    const ref = db.collection(collection).doc();
    await ref.create(row);
    return NextResponse.json({ data: { id: ref.id, ...row } }, { status: 201 });
  } catch (error: any) {
    const message = error?.message || 'ERROR';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 400;
    const messages: Record<string, string> = {
      INVALID_JOINER: 'El correo del Joiner no es válido.',
      INVALID_AMOUNT: 'El importe debe ser mayor que cero.',
      NO_OUTSTANDING_BALANCE: 'No encontramos un saldo pendiente para este Joiner en el área seleccionada.',
      PAYMENT_EXCEEDS_BALANCE: 'El importe supera el saldo pendiente de este Joiner en el área seleccionada.',
      GO_REQUIRED: 'Selecciona un GO para registrar este movimiento.',
      ORDER_FIELDS_REQUIRED: 'Completa el correo y el producto del pedido.',
      GO_ORDER_FIELDS_REQUIRED: 'Para un pedido GO debes seleccionar producto, GO y slot.',
      SHOP_ORDER_FIELDS_REQUIRED: 'Selecciona un producto de Shop.',
      SHOP_PRODUCT_NOT_FOUND: 'No encontramos el producto de Shop seleccionado.',
      SHOP_VARIANT_REQUIRED: 'Selecciona una variante del producto.',
      PRODUCT_NOT_FOUND: 'No encontramos el producto GO seleccionado.',
      PRODUCT_GO_MISMATCH: 'El producto no pertenece al GO seleccionado.',
      INVALID_SLOT: 'El slot no pertenece a la lista de este producto.',
      OUT_OF_STOCK: 'No hay stock suficiente para esa cantidad.',
      INVALID_ORDER_AMOUNT: 'Revisa la cantidad y el precio del pedido.',
      SLOT_ALREADY_ASSIGNED: 'Ese slot ya está asignado a otra persona. Revisa el pedido existente antes de continuar.',
      UPDATE_FIELDS_REQUIRED: 'Completa el GO, el título y el mensaje del aviso.',
      INVALID_OPERATION: 'Tipo de operación no válido.',
    };
    return NextResponse.json({ error: messages[message] || message }, { status });
  }
}
