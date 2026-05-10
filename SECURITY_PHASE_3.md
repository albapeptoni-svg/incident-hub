# SECURITY PHASE 3

## Cambios realizados

- Se desactivo el signup publico en la configuracion local de Supabase.
- Se endurecio la creacion automatica de profiles nuevos: rol `visor` y `activo = false`.
- Se agrego una migracion conservadora que solo cambia defaults y trigger para usuarios nuevos.
- El login valida `profiles.activo` despues de autenticar. Si la cuenta no esta disponible, cierra sesion y muestra un mensaje generico.
- Se agrego `src/lib/logger.ts` para evitar payloads sensibles en produccion.
- Se agrego `src/lib/safeError.ts` para centralizar mensajes seguros de UI.
- Se sustituyeron logs peligrosos de partes, incidencias, cola SIEC y OCR por mensajes con contadores o estados no sensibles.
- Se agregaron cabeceras basicas en `vercel.json`.

## Archivos modificados

- `supabase/config.toml`
- `supabase/sql/001_auth_profiles.sql`
- `supabase/sql/008_harden_new_profile_defaults.sql`
- `src/lib/logger.ts`
- `src/lib/safeError.ts`
- `src/pages/Login.tsx`
- `src/hooks/useAuth.tsx`
- `src/hooks/use-data.ts`
- `src/services/operationalData.service.ts`
- `src/pages/Cola.tsx`
- `src/pages/OCRPartes.tsx`
- `src/pages/PartesList.tsx`
- `src/pages/Admin.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Historial.tsx`
- `src/components/GeminiTest.tsx`
- `server/index.js`
- `supabase/functions/gemini-ocr/index.ts`
- `vercel.json`

## Riesgos corregidos

- Nuevos usuarios creados por trigger ya no entran activos ni con rol operativo.
- Login no revela si el email existe, si falta profile o si la cuenta esta inactiva.
- Logs de frontend dejan de imprimir partes, incidencias, payloads OCR y respuestas completas.
- Errores visibles en OCR y cola SIEC usan mensajes genericos.
- Vercel queda preparado con headers defensivos basicos sin CSP estricta.

## Riesgos pendientes

- Confirmar y desactivar signup publico en Supabase hosted desde Dashboard.
- Validar JWT y rol en el backend Gemini si se despliega `server/index.js`.
- Revisar politicas RLS reales en Supabase hosted.
- Revisar Storage real, buckets y URLs existentes.
- El borrador OCR sensible sigue en `localStorage` por decision de fase.
- No se ha implementado CSP estricta.

## Acciones manuales en Supabase Dashboard

1. Ir a Authentication > Sign In / Providers.
2. Desactivar signup publico para Email.
3. Confirmar que no hay providers externos con alta libre.
4. Aplicar la migracion `008_harden_new_profile_defaults.sql`.
5. Verificar que los usuarios nuevos quedan con `rol = visor` y `activo = false`.
6. Activar manualmente solo los usuarios preaprobados y asignar rol real.

## Acciones pendientes para Vercel

- Confirmar que no existen variables privadas con prefijo `VITE_`.
- Confirmar que `GEMINI_API_KEY` solo vive en backend/Edge Function.
- Desplegar con el nuevo `vercel.json`.
- Revisar proteccion de preview deployments si contienen datos reales.

## Que NO se ha tocado todavia

- RLS agresivo por centro/equipo.
- Eliminacion de `localStorage` de OCR.
- Refactor profundo de Gemini/OCR.
- Migraciones destructivas.
- CSP estricta.

## Como probar que no se ha roto el flujo

1. Ejecutar `npm run build`.
2. Entrar con un usuario activo: debe llegar a `/dashboard`.
3. Entrar con credenciales invalidas: debe mostrar `Credenciales incorrectas o cuenta no disponible.`
4. Entrar con un usuario inactivo: debe cerrar sesion y mostrar el mismo mensaje generico.
5. Crear una revision OCR, guardar parte y comprobar que se crea en Supabase.
6. Enviar un parte a Cola SIEC y comprobar que no aparecen partes/incidencias completas en consola.
7. Abrir Administracion con admin activo y verificar que puede activar usuarios preaprobados.
