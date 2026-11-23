# Siguiente paso — subir la rama de migración

**No subas este proyecto a `main` y no lo despliegues a producción todavía.**

1. En GitHub abre `atelierdehyun/maisondehyune`.
2. Confirma que la rama seleccionada arriba a la izquierda sea `firebase-migration`.
3. Extrae este ZIP en tu computadora.
4. En esa rama, pulsa **Add file → Upload files**.
5. Arrastra el contenido de la carpeta extraída (incluyendo `app`, `lib`, `migration-data`, `public`, `package.json`, etc.) a la ventana de GitHub. Mantén la estructura de carpetas y acepta reemplazar archivos existentes.
6. En el mensaje de commit escribe `Prepare Firebase migration` y pulsa **Commit changes** sobre `firebase-migration`.

Vercel debe generar una implementación **Preview** de esa rama. No cambies el dominio de producción ni hagas merge a `main`.

## Después del commit
- Revisa el resultado del Preview de Vercel y copia el enlace de Preview.
- Si el build falla, no intentes arreglarlo editando archivos a mano: comparte aquí el texto o una captura del error.
- Si compila, probaremos login, lectura pública, claims, compras y panel admin antes de importar datos.

## Verificación técnica realizada aquí
- Se revisó que los 24 archivos TypeScript/TSX pasen el análisis sintáctico.
- No se pudo ejecutar `npm install` ni `next build` en este entorno porque npm no pudo resolver `registry.npmjs.org` (error de DNS `EAI_AGAIN`). Por eso la compilación real sigue pendiente en Vercel.
