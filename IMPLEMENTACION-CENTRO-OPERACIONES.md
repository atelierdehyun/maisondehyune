# Centro de operaciones y flujos conectados

## Rutas
- `/admin/centro`: pagos, pedidos manuales, avisos GO y comprobantes.
- `/admin/fotos`: biblioteca de imágenes de catálogo.
- `/api/admin/operations`: API administrativa protegida para operaciones y lectura de datos.
- `/api/joiner/updates`: feed de avisos con verificación de pertenencia.
- `/api/proofs`: subida privada, enlace firmado temporal y revisión de comprobantes.
- `/api/admin/media-library`: metadatos de biblioteca multimedia.

## Colecciones nuevas
- `operaciones_pagos`
- `operaciones_pedidos`
- `operaciones_actualizaciones`
- `comprobantes_pago`
- `media_library`

Firestore crea estas colecciones al primer guardado; no requieren una migración inicial.

## Pagos
Cada pago lleva `scope` (`GO` o `SHOP`), correo, importe, método y referencia. El endpoint distribuye el abono en los registros históricos del área correspondiente, actualiza `monto_abonado` y marca `estado_pago` cuando se cubre el saldo. Se rechazan importes superiores al saldo pendiente.

## Pedidos manuales
- GO: requiere GO, producto, slot, Joiner y cantidad. Se valida el producto y el stock dentro de una transacción y se escriben `claims_integrantes` y `seguimiento_claims`.
- Shop: crea el pedido en la colección histórica `pedidos` con `tipo_servicio: SHOP`, para que aparezca en Mi escritorio y en el panel.

## Comprobantes
Se almacenan en Firebase Storage privado. El bucket debe estar configurado y la cuenta de servicio debe tener permisos de Storage. Los enlaces firmados duran 10 minutos. No almacenar comprobantes bancarios en Cloudinary público.

## Fotos
La biblioteca permite seleccionar hasta 20 archivos por tanda. Cada foto se sube a Cloudinary y se guarda su referencia en `media_library`; después se asigna la portada y/o galería al producto elegido.
