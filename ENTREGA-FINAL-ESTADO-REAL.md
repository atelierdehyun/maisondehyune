# Hyuneatelier — actualización integrada (entrega de trabajo)

Esta entrega parte del ZIP de `main` que la usuaria compartió en esta conversación. No contiene credenciales, no realiza commits, no ejecuta migraciones y no escribe datos en Firebase durante la preparación.

## Funciones incluidas en el código

- Centro administrativo en `/admin/centro` para pagos, pedidos manuales, avisos y revisión de comprobantes.
- Pagos nuevos GO/Shop con aplicación transaccional al campo histórico `monto_abonado` que ya leen el panel y Mi escritorio. Los pagos GO se limitan al GO seleccionado; los pagos Shop se aplican a pedidos Shop del Joiner.
- El botón de abono del panel administrativo utiliza el registro de pagos nuevo, en lugar de concentrar todo el abono en el primer artículo.
- Registro manual de pedidos Shop en `pedidos`, compatible con Mi escritorio.
- Registro manual de pedidos GO vinculado a `productos.claims_integrantes` y `seguimiento_claims`, con validación transaccional de GO, producto, slot, duplicidad y stock.
- Normalización de campos JSON históricos (`claims_integrantes`, `stock_slots`, `variantes`, `fotos_extra`) en el endpoint de datos. Esto corrige pantallas que recibían esos campos como texto y no podían recorrer los pedidos/slots.
- Feed de avisos para Joiners autenticados. La pertenencia se comprueba mediante `seguimiento_claims` y la relación producto→GO; los claims cancelados no dan acceso.
- Solicitudes de envío GO y Shop no se pueden mezclar en una misma solicitud desde Mi escritorio; el tipo de servicio se guarda y se identifica en administración.
- Comprobantes subidos desde Mi escritorio a Firebase Storage privado, con acceso temporal firmado (10 minutos) para el dueño o administración. El panel permite verlos y marcarlos verificados/rechazados.
- Biblioteca multimedia en `/admin/fotos`: selección de hasta 20 imágenes, subida a Cloudinary, registro de biblioteca y asignación a portada/galería de productos Shop o GO.
- Validación de MIME, tamaño y carpetas permitidas en el endpoint público de subida de imágenes de catálogo.

## Configuración necesaria

- Mantener las variables Firebase ya utilizadas por el proyecto.
- Para comprobantes privados, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` debe apuntar al bucket real de Firebase Storage y la cuenta de servicio de Firebase Admin debe tener permisos para crear/leer objetos y generar URLs firmadas.
- Mantener `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` para las fotos públicas de catálogo.
- Los comprobantes bancarios NO se suben a Cloudinary público.

## Seguridad y datos

- No se ejecutaron escrituras de base de datos durante la preparación.
- No se ejecutó ninguna migración.
- No se usó Supabase Storage ni se intentó recuperar imágenes desde Supabase.
- Los pagos se aplican en una transacción Firestore y se conserva un registro en `operaciones_pagos`.
- Los comprobantes se almacenan bajo `private-payment-proofs/` y no se guardan URLs públicas en Firestore.
- Las imágenes de catálogo se alojan en Cloudinary; su URL pública se asigna al producto seleccionado.

## Verificación

- Se comprobó la integridad del ZIP de origen y del paquete final.
- Se ejecutó el parser/transpilador TypeScript sobre los archivos modificados: sin errores de sintaxis.
- `npm ci` no pudo completarse en este entorno (timeout; el modo offline confirmó que no estaban todas las dependencias en caché). Por tanto, no se pudo ejecutar `next build` ni pruebas de integración reales con Firebase/Cloudinary.
- Antes de producción, instalar dependencias, ejecutar `npm run build` y hacer pruebas en una rama/preview con una cuenta admin y dos Joiners de prueba.

## Importante

Este paquete contiene una integración de código preparada para revisión, pero no está certificada para producción porque no se pudo ejecutar el build ni validar las credenciales/permisos de Firebase Storage y Cloudinary en el entorno real. No hacer despliegue directo a producción sin probar primero el Preview.
