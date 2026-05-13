# Deploy Vercel Security

## Resumen de estado

La aplicacion esta preparada para desplegar el frontend en Vercel usando Supabase Auth, Supabase Database y la Edge Function `gemini-ocr` como backend recomendado para OCR/Gemini.

Estado de hardening ya aplicado:

- Signup publico preparado para estar cerrado.
- Roles operativos: `admin` y `tecnico`.
- `profiles.activo` requerido.
- Login con mensaje generico y bloqueo por intentos fallidos.
- OCR protegido por JWT, usuario activo y rol.
- Logs y errores seguros.
- Headers basicos en `vercel.json`.

No se ha aplicado CSP estricta todavia.

## Variables permitidas en frontend

Estas variables si pueden estar en Vercel para el frontend:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=ey...
VITE_GEMINI_API_URL=https://TU-PROYECTO.supabase.co/functions/v1/gemini-ocr
```

`VITE_GEMINI_API_URL` debe apuntar a un backend propio o a Supabase Edge Function. Nunca debe apuntar directamente a `generativelanguage.googleapis.com`.

Ejemplo local:

```env
VITE_GEMINI_API_URL=http://localhost:8787/api/analizar-parte
```

Ejemplo produccion recomendado:

```env
VITE_GEMINI_API_URL=https://TU-PROYECTO.supabase.co/functions/v1/gemini-ocr
```

## Variables prohibidas en frontend

No poner estas variables en un despliegue frontend de Vercel:

```env
GEMINI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
VITE_GEMINI_API_KEY
VITE_SUPABASE_SERVICE_ROLE_KEY
VITE_SIEC_PASSWORD
```

Cualquier variable con prefijo `VITE_` queda expuesta al navegador.

## Variables backend/secretas

Para Supabase Edge Function `gemini-ocr`:

```env
GEMINI_API_KEY=...
OCR_ALLOWED_ORIGINS=http://localhost:8080,https://TU-DOMINIO.vercel.app
```

Supabase proporciona `SUPABASE_URL` y `SUPABASE_ANON_KEY` en el entorno de funciones. Si tu proyecto no las expone automaticamente, configurarlas como secrets.

Para `server/index.js` local o backend propio:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_ALLOWED_ORIGINS=http://localhost:8080,https://TU-DOMINIO.vercel.app
GEMINI_SERVER_PORT=8787
```

Usar `SUPABASE_SERVICE_ROLE_KEY` solo en backend privado. Nunca en React/Vite.

## Configuracion Vercel paso a paso

1. Crear proyecto en Vercel apuntando al repositorio.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. En Environment Variables, Production:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_URL`
6. No anadir `GEMINI_API_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` al frontend.
7. Desplegar.
8. Confirmar que `vercel.json` aplica headers basicos.

## Configuracion Supabase paso a paso

### Auth URLs

En Supabase Dashboard > Authentication > URL Configuration:

- Site URL: `https://TU-DOMINIO.vercel.app`
- Redirect URLs:
  - `https://TU-DOMINIO.vercel.app/*`
  - `http://localhost:8080/*`
  - `http://localhost:5173/*`

Si se usa dominio personalizado, agregar tambien:

- `https://TU-DOMINIO-PROPIO/*`

### Signup

En Authentication > Providers > Email:

- Desactivar signup publico.
- Crear usuarios manualmente o mediante flujo admin seguro.

### Migraciones

Aplicar las migraciones pendientes antes de usar datos reales:

- perfiles/roles
- hardening
- OCR/SIEC
- login lockout

Verificar que existen usuarios `admin` y `tecnico` activos.

## Edge Function paso a paso

1. Confirmar que `supabase/config.toml` mantiene `verify_jwt = true` para `gemini-ocr`.
2. Configurar secrets:

```powershell
supabase secrets set GEMINI_API_KEY="..."
supabase secrets set OCR_ALLOWED_ORIGINS="http://localhost:8080,https://TU-DOMINIO.vercel.app"
```

3. Desplegar funcion:

```powershell
supabase functions deploy gemini-ocr
```

4. Configurar en Vercel:

```env
VITE_GEMINI_API_URL=https://TU-PROYECTO.supabase.co/functions/v1/gemini-ocr
```

5. Probar OCR con usuario activo `admin` o `tecnico`.

## Headers Vercel

`vercel.json` debe incluir:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

No se agrega CSP estricta en esta fase.

## Proteccion de previews

Los Preview Deployments no deben usar datos reales sin proteccion.

Recomendado:

- Activar Vercel Deployment Protection / Vercel Authentication para previews.
- Usar proyecto Supabase separado para preview/staging.
- No reutilizar `GEMINI_API_KEY` de produccion en previews publicos.
- No apuntar previews a una base con partes reales.

## Checklist antes de deploy

- `npm.cmd run build` correcto.
- `.env` y `.env.local` no se suben al repositorio.
- No existe `VITE_GEMINI_API_KEY`.
- No existe `VITE_SUPABASE_SERVICE_ROLE_KEY`.
- `VITE_GEMINI_API_URL` no apunta a Google Gemini directamente.
- Signup publico desactivado en Supabase hosted.
- Hay al menos un usuario `admin` activo.
- Edge Function desplegada con `GEMINI_API_KEY`.
- `OCR_ALLOWED_ORIGINS` incluye dominio Vercel final.
- Supabase Auth Site URL y Redirect URLs incluyen Vercel y localhost.
- Preview deployments protegidos si usan datos reales.

## Checklist despues de deploy

- Abrir dominio Vercel.
- Login con `admin` activo.
- Login con `tecnico` activo.
- Usuario inactivo no entra.
- Intentos fallidos muestran siempre mensaje generico.
- OCR funciona con usuario activo.
- OCR sin sesion falla.
- Admin puede abrir `/admin`.
- Tecnico no puede abrir `/admin`.
- Headers visibles en respuesta HTTP.

## Pruebas de login

- Credenciales validas `admin`: entra.
- Credenciales validas `tecnico`: entra.
- Email inexistente: mensaje generico.
- Password incorrecta: mensaje generico.
- Usuario inactivo: mensaje generico.
- 5/10/15 fallos: comprobar `account_security`.

## Pruebas OCR

- Usuario `admin` o `tecnico` activo puede analizar imagen.
- Sin sesion: 401 generico.
- Usuario inactivo: 403 generico.
- Payload vacio: error generico de archivo.
- Imagen mayor que el limite: error generico de archivo.
- No aparecen payloads OCR completos en logs del navegador.

## Rollback

1. En Vercel, volver al deployment anterior.
2. Si falla OCR, restaurar `VITE_GEMINI_API_URL` al backend local/proxy anterior temporalmente.
3. Si falla Edge Function, revisar secrets y redeploy.
4. No eliminar tablas de auditoria o lockout salvo decision explicita.

## Advertencias con datos reales

- No usar previews publicos con datos reales.
- No compartir capturas OCR con datos de clientes en herramientas externas.
- No copiar `.env` real en tickets o chats.
- No almacenar service role en frontend ni en variables `VITE_`.
