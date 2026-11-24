# Hyuneatelier — estado de migración Firebase

## Incluido en esta entrega
- Inicialización Firebase Client y Firebase Admin.
- API pública de lectura de GOs y productos con caché corta.
- API autenticada para claims que usa transacción Firestore y valida disponibilidad.
- API de importación protegida para la cuenta administradora `liahwang1852@gmail.com`.
- Exportaciones CSV conservadas como JSON en `migration-data/`.

## Aún NO es una versión desplegable
Las páginas actuales siguen importando el cliente Supabase directamente. En particular, login/registro, panel admin, shop, escritorio, perfil, solicitudes de envío, almacenamiento de imágenes y todas las mutaciones administrativas deben migrarse antes de retirar Supabase. No desplegar este estado ni borrar el proyecto Supabase.

## Importante sobre cuentas
Las contraseñas de Supabase no se pueden exportar a Firebase Authentication. Los usuarios tendrán que crear/restablecer su contraseña en Firebase. Los perfiles y pedidos sí se importan desde los JSON, pero los datos personales deben mantenerse protegidos.

## Colecciones de datos exportadas
`gos`, `productos`, `seguimiento_claims`, `perfiles_joiners`, `integrantes_fotos`, `tienda_productos`, `pedidos`, `solicitudes_envio`, `wishlist_joiners` y `pedidos_totales_por_joiner`.

## Variables
Configurar las variables de `.env.firebase.example` en Vercel y localmente. Nunca subir claves privadas al repositorio.
