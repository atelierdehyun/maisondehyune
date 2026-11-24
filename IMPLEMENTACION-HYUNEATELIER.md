# Hyuneatelier — guía de la actualización integrada

## Accesos administrativos
- `/admin`: panel original de gestión.
- `/admin/centro`: libro de pagos, pedidos manuales, avisos y comprobantes.
- `/admin/fotos`: biblioteca para cargar varias fotos y asignarlas a Shop, productos GO o portadas GO.

## Flujos
1. Los Joiners pueden adjuntar un comprobante privado desde Mi escritorio. La administración lo revisa en Centro de operaciones.
2. Al registrar un pago desde el panel antiguo o el centro nuevo, el importe se aplica a los pedidos del Joiner dentro de la sección seleccionada (GO concreto o Shop) y queda en `operaciones_pagos`.
3. Los pedidos Shop manuales descuentan inventario y aparecen en Mi escritorio.
4. Los pedidos GO manuales actualizan los slots del producto y su seguimiento. El slot se valida dentro de una transacción para impedir asignaciones duplicadas.
5. Las solicitudes de envío no permiten mezclar artículos GO y Shop en una misma solicitud.
6. Los avisos de cada GO se muestran solo a cuentas con claims activos en ese GO.

## Antes de producción
El código se preparó y se comprobó sintácticamente, pero este entorno no pudo completar `npm ci`; por tanto, no se certificó `next build`. Hacer pruebas en Preview con datos/cuentas de prueba antes de producción. Ver `ENTREGA-FINAL-ESTADO-REAL.md`.
