# SECURITY PHASE 5 - LOGIN LOCKOUT

## Objetivo

Implementar bloqueo real por intentos fallidos de login sin revelar si un email existe, si la cuenta esta bloqueada, si esta inactiva o si la contraseña es incorrecta.

Mensaje visible unico:

`Credenciales incorrectas o cuenta no disponible.`

## Tablas creadas

### `public.login_attempts`

Registra intentos de login sin exponerlos al publico:

- `id`
- `created_at`
- `email`
- `user_id`
- `success`
- `reason`
- `ip`
- `user_agent`

### `public.account_security`

Guarda el estado de bloqueo por usuario real:

- `user_id`
- `failed_attempts`
- `locked_until`
- `hard_locked`
- `updated_at`

## RPC creadas

### `public.get_login_lock_status(p_email text)`

- Normaliza email.
- Busca usuario en `profiles` o `auth.users`.
- Si no existe, devuelve no bloqueado.
- No crea `account_security` para emails inexistentes.
- Devuelve solo estado generico suficiente para el cliente.

### `public.register_login_failure(p_email text, p_reason text default null)`

- Normaliza email.
- Registra intento en `login_attempts`.
- Si el email existe, incrementa `account_security.failed_attempts`.
- Aplica:
  - `>= 5`: bloqueo temporal 15 minutos.
  - `>= 10`: bloqueo temporal 1 hora.
  - `>= 15`: bloqueo duro hasta desbloqueo admin.
- Si el email no existe, registra intento generico sin crear `account_security`.

### `public.register_login_success(p_user_id uuid)`

- Resetea `failed_attempts`.
- Limpia `locked_until`.
- Limpia `hard_locked`.
- Registra intento correcto.

### `public.admin_unlock_user(p_user_id uuid)`

- Solo admin.
- Resetea contador y bloqueos.

## RLS

- `login_attempts`: sin lectura publica; solo admin puede leer.
- `account_security`: sin lectura publica; solo admin puede leer/actualizar.
- Usuarios normales no pueden ver intentos ni bloqueos.
- Las RPC usan `SECURITY DEFINER` con `search_path` acotado.

## Flujo de login

1. El frontend normaliza el email.
2. Llama a `get_login_lock_status(email)`.
3. Si esta bloqueado, muestra el mensaje generico y no intenta login.
4. Si no esta bloqueado, llama a `supabase.auth.signInWithPassword`.
5. Si falla, llama a `register_login_failure(email, 'invalid_credentials')`.
6. Si autentica, consulta `profiles`.
7. Si el perfil no esta activo o el rol no es `admin`/`tecnico`, cierra sesion y registra fallo.
8. Si el perfil es valido, llama a `register_login_success(user.id)` y entra.

## Como probar

### 5 fallos

1. Usar un email existente.
2. Introducir contraseña incorrecta 5 veces.
3. El siguiente intento debe mostrar el mensaje generico sin entrar.
4. En SQL, comprobar:

```sql
select p.email, s.failed_attempts, s.locked_until, s.hard_locked
from public.account_security s
join public.profiles p on p.id = s.user_id
where lower(p.email) = lower('usuario@empresa.com');
```

### 10 fallos

Repetir fallos acumulados hasta 10. Debe quedar `locked_until` aproximadamente a 1 hora.

### 15 fallos

Repetir fallos acumulados hasta 15. Debe quedar `hard_locked = true`.

### Login correcto

Con usuario activo `admin` o `tecnico`, login correcto debe resetear:

- `failed_attempts = 0`
- `locked_until = null`
- `hard_locked = false`

### Email inexistente

Intentos con email inexistente:

- No revelan existencia.
- Insertan registro generico en `login_attempts`.
- No crean fila util en `account_security`.

## Desbloquear usuario

Desde SQL editor o desde una llamada RPC autenticada como admin:

```sql
select public.admin_unlock_user('USER_UUID_AQUI');
```

Inspeccion admin:

```sql
select p.email, p.rol, p.activo, s.failed_attempts, s.locked_until, s.hard_locked, s.updated_at
from public.account_security s
join public.profiles p on p.id = s.user_id
order by s.updated_at desc;
```

Ultimos intentos:

```sql
select created_at, email, user_id, success, reason, ip, user_agent
from public.login_attempts
order by created_at desc
limit 100;
```

## Riesgos anti-abuso

- Se incrementa bloqueo por email existente, lo que permite proteger fuerza bruta pero tambien puede ser usado para bloqueo malicioso.
- Para reducir enumeracion, emails inexistentes no crean `account_security` y la UI siempre muestra el mismo mensaje.
- La IP se intenta capturar desde cabeceras de Supabase/PostgREST (`x-forwarded-for`, `cf-connecting-ip`, `x-real-ip`). Si Supabase no expone estas cabeceras, `ip` quedara `null`.
- No se confia en `localStorage` ni en datos de IP enviados por el cliente.

## Limitaciones

- El bloqueo se gestiona desde RPC invocables antes de login; para proteccion mas fuerte contra bloqueo malicioso conviene mover el login completo a una Edge Function con rate limit por IP/proveedor.
- No se ha agregado UI completa de desbloqueo en Admin para evitar rediseño. La RPC `admin_unlock_user` queda disponible.
- No se han cambiado RLS operativas, OCR/Gemini, Storage, CSP ni `localStorage` OCR.

## Rollback

1. Restaurar `src/pages/Login.tsx`.
2. Eliminar o no aplicar `supabase/sql/010_login_attempt_lockout.sql`.
3. Si ya se aplico la migracion, se puede desactivar el flujo retirando llamadas RPC del login.
4. No borrar tablas con datos de auditoria salvo decision explicita.
