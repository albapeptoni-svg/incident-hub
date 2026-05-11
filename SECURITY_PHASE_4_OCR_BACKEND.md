# SECURITY PHASE 4 - OCR BACKEND

## Que se ha protegido

- `server/index.js` exige `Authorization: Bearer <access_token>` antes de procesar OCR.
- El backend valida el JWT con Supabase, obtiene el usuario real y consulta `profiles`.
- Solo pueden procesar OCR usuarios activos con rol `admin` o `tecnico`.
- Se rechazan payloads vacios, tipos no permitidos y base64 demasiado grande.
- Se aplica rate limit en memoria: 20 solicitudes OCR cada 15 minutos por usuario y 60 por IP.
- La Edge Function `gemini-ocr` mantiene `verify_jwt = true` y ahora comprueba `profiles`.
- Se evita devolver `rawText`, detalles completos de Gemini, stack traces o payloads del proveedor.
- El frontend conserva el contrato actual: envia imagen base64 y recibe JSON directo o `{ data }`.

## Validacion JWT

### Node/Express

1. Lee `Authorization`.
2. Exige formato `Bearer token`.
3. Usa `supabase.auth.getUser(token)`.
4. Consulta `profiles` por `user.id`.
5. Requiere `activo = true`.
6. Requiere rol en `admin` o `tecnico`.

### Supabase Edge Function

1. Lee `Authorization`.
2. Valida el token contra `/auth/v1/user`.
3. Consulta `profiles` por REST con el JWT del usuario.
4. Requiere `activo = true`.
5. Requiere rol en `admin` o `tecnico`.

## Variables necesarias

### Frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_URL`

`VITE_GEMINI_API_URL` debe apuntar a backend/Edge Function, nunca a Google Gemini.

### Backend Node/Express

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_SERVER_PORT` o `PORT`
- `GEMINI_ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` recomendado, solo backend

### Supabase Edge Function

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OCR_ALLOWED_ORIGINS`

Nunca usar:

- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

## Como probar local

1. Configurar `.env.local` con variables backend.
2. Ejecutar `npm.cmd run server:gemini`.
3. Ejecutar la app Vite en otra terminal.
4. Con usuario `admin` o `tecnico` activo, analizar una imagen OCR.
5. Sin sesion o con token eliminado, `/api/analizar-parte` debe devolver 401.
6. Con usuario inactivo o rol distinto de `admin`/`tecnico`, debe devolver 403.
7. Enviar payload vacio debe devolver 400.
8. Repetir mas de 20 OCR en 15 minutos debe devolver 429.

## Como probar Edge Function

1. Confirmar `verify_jwt = true` en `supabase/config.toml`.
2. Configurar secrets: `GEMINI_API_KEY` y `OCR_ALLOWED_ORIGINS`.
3. Invocar la funcion con JWT de usuario activo `admin` o `tecnico`.
4. Probar sin Authorization: debe devolver 401.
5. Probar con usuario inactivo o rol distinto de `admin`/`tecnico`: debe devolver 403.
6. Confirmar que la respuesta no incluye `rawText`.

## Riesgos pendientes

- El rate limit de Edge Function no usa almacenamiento compartido; para produccion fuerte haria falta Redis, Supabase o gateway.
- `server/index.js` sigue siendo un backend local/simple; si se despliega, debe estar detras de HTTPS y variables backend correctas.
- El borrador OCR sigue en `localStorage` por decision de fase.
- No se ha introducido CSP estricta.
- No se ha cambiado RLS por centro/equipo.

## Que no se ha tocado

- RLS agresivo.
- `localStorage` OCR.
- Diseno visual.
- Migraciones destructivas.
- CSP estricta.
- Contrato principal del frontend OCR.

## Plan de rollback

1. Restaurar `server/index.js` y `supabase/functions/gemini-ocr/index.ts` desde git.
2. Restaurar `.env.example` si los cambios de variables causan confusion.
3. Mantener `src/services/geminiParteService.ts` compatible: basta con que el backend devuelva el JSON OCR anterior.
4. Volver a ejecutar `npm.cmd run build`.
