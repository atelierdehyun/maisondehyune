# Cambios incluidos en esta entrega

## Operaciones
- Pagos GO/Shop con aplicación de abonos al historial existente y registro de cada movimiento.
- Asociación automática del comprobante pendiente más reciente que coincida con Joiner y área.
- Pedidos manuales de WhatsApp: GO vincula producto/slot y valida stock en transacción; Shop vincula producto/variante y descuenta inventario.
- Avisos por GO con acceso basado en claims activos.
- Solicitudes de envío separadas por GO o Shop.

## Administración y catálogo
- Centro de operaciones con resumen de pagos, comprobantes pendientes y envíos pendientes.
- Biblioteca de fotos para cargar hasta 20 imágenes por tanda desde móvil, con destinos Shop, productos GO y portadas GO.
- Edición de imágenes existentes de Shop conservada.
- Campos JSON históricos normalizados para que el panel pueda leer claims, stock y variantes.

## Joiners
- Mi escritorio recibe avisos privados.
- Los productos solo devuelven al Joiner autenticado sus propios slots, sin exponer correos de otras personas.
- El Joiner puede subir comprobantes privados desde Mi escritorio.

## Pruebas pendientes
El análisis sintáctico y la comprobación TypeScript de rutas de servidor con tipos auxiliares no detectaron errores. La instalación de dependencias no pudo completarse en este entorno, por lo que falta ejecutar el build real y pruebas de integración en Preview.
