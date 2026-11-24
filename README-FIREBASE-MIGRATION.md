# Hyuneatelier — migración Firebase

Esta rama migra la capa de datos de la web a Firebase Authentication + Firestore y usa Cloudinary para imágenes nuevas y para trasladar imágenes antiguas.

## Arquitectura
- Next.js 13.5.1 en Vercel.
- Firebase Authentication (email/contraseña).
- Firestore mediante Firebase Admin en rutas API; las reglas cliente pueden permanecer en deny-all.
- Cloudinary para imágenes. El secreto nunca se expone al navegador.
- La interfaz conserva temporalmente la sintaxis de consultas previa mediante `app/supabase.ts`, que ahora es una capa de compatibilidad y NO importa Supabase.

## Variables de entorno
Configura en Vercel (Production, Preview y Development):
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

No subas `.env.local`, JSON de service account, claves privadas ni secretos a GitHub.

## Importar datos
1. Despliega primero esta rama solo después de completar revisión y pruebas.
2. Inicia sesión con `liahwang1852@gmail.com`.
3. Abre `/admin/migracion` y pulsa **Importar los 9 respaldos** una sola vez.
4. Verifica cantidades y registros en Firestore.
5. En la misma pantalla, pulsa **Procesar siguiente tanda** para trasladar imágenes antiguas a Cloudinary. Repite hasta que `Pendientes` sea 0. Si hay errores, no elimines el origen.

## Seguridad
- Firestore cliente permanece cerrado; todas las lecturas/escrituras pasan por rutas API.
- Las rutas privadas verifican Firebase ID tokens.
- Las operaciones administrativas exigen el correo administrador indicado en `lib/firebaseAdmin.ts`.
- Claims GO y compras de tienda usan transacciones de Firestore para validar stock.
- Los datos privados (perfiles, pedidos y direcciones) no se exponen en endpoints públicos.

## Limitaciones pendientes de verificación
- Las contraseñas de Supabase no se pueden exportar. Los usuarios deberán registrarse o restablecer su acceso en Firebase.
- El traslado de imágenes depende de que las URLs públicas antiguas sigan respondiendo. Las que fallen deben re-subirse manualmente.
- Ejecutar instalación/build y pruebas reales antes de producción. No borrar Supabase hasta verificar datos, imágenes, login, claims, pedidos y envíos.
