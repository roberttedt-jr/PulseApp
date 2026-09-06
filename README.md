# Pulse

<p align="center">
  <img src="public/pulse-icon.png" width="120" height="120" alt="Pulse" />
</p>

Tracker de entrenamientos con el pulso de iOS: series en vivo, PRs, racha y un Pulse Score que resume la semana.

![Landing de Pulse](screenshots/app-builder-preview.png)

## Stack

- TanStack Start + React 19 + TypeScript
- Tailwind CSS v4 + Radix UI
- Framer Motion + View Transitions API
- Postgres (Neon en producción, PGLite en preview). Cualquier Postgres 15+, incluido el de un proyecto Supabase, funciona como `DATABASE_URL`.
- Better Auth (email/password; Google/X vía broker en deploy de Grok)
- Recharts, Zod, Sonner
- Avatares: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) cuando `BLOB_READ_WRITE_TOKEN` está definido

Pulse **no** usa el cliente JS de Supabase ni RLS del navegador. El navegador habla solo con las server functions; Postgres se consulta en el servidor, siempre filtrado por el `user_id` de la sesión.

## Cuentas nuevas

Una cuenta recién creada empieza **vacía**. No se insertan entrenamientos, PRs, peso, rutinas personales, posts ni atletas de demostración. Las plantillas PPL / Upper-Lower / Full Body viven en la biblioteca y solo se copian a la cuenta si el usuario las elige.

Para sembrar datos de prueba en local (nunca en producción):

```bash
PULSE_SEED_DEMO=1 npm run dev
```

En desarrollo aparece en Perfil el botón **Limpiar datos de prueba**. En producción ese botón no existe.

## Foto de perfil

El recorte (cuadrado 1:1, máx. 1024 px) y la compresión (WebP/JPEG) ocurren en el cliente. El servidor valida MIME y tamaño (máx. 2 MB) y guarda solo la foto del usuario autenticado.

| Variable | Obligatoria | Qué es |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | recomendada en Vercel | Token de [Vercel Blob](https://vercel.com/docs/storage/vercel-blob). Sin ella, Pulse guarda el data URL ya comprimido (~80–150 KB) en `profiles.image`. Neon no ofrece object storage. |

No se suben binarios crudos a Postgres. El fallback a data URL existe solo cuando Blob no está configurado. Los paths de Blob son `avatars/<userId>/<id>.<ext>` y un usuario no puede borrar la foto de otro.

## Apple Health

Pulse es una web/PWA: **no puede** pedir permisos de HealthKit ni leer el Apple Watch. En Ajustes → Integraciones aparece **Apple Health · Próximamente**, con aviso opcional `healthkit_notify`. Los entrenamientos y el peso llevan `source` (`manual` \| `imported` \| `healthkit`) para una futura app nativa. Nada se inventa.

## Funciones

- Onboarding breve: nombre, objetivo, unidades, días/semana y primera acción (crear rutina / empezar sin / explorar plantillas)
- Dashboard: sesión de hoy, volumen, grupos musculares, PRs, racha, Pulse Score — o empty states si no hay datos
- Rutinas propias + biblioteca PPL / Upper-Lower / Full Body
- Biblioteca de 200+ ejercicios, favoritos, historial y 1RM Epley
- Entrenamiento en vivo con timer circular, pesos de la última sesión y toast de PR
- Historial, progreso corporal, heatmap, logros y feed social
- Transiciones de pestaña 180–240 ms (View Transitions + fallback Motion)

## Local

```bash
npm install
npm run dev
```

Sin `DATABASE_URL` usa PGLite. La primera cuenta **no** recibe historial ni rutinas inventadas.

## Deploy (Vercel)

1. Crea un Postgres (Neon, o Project Settings → Database → URI en Supabase).
2. En Vercel, define estas variables:

| Variable | Obligatoria | Qué es |
|---|---|---|
| `DATABASE_URL` | sí | Connection string Postgres (`sslmode=require`) |
| `BETTER_AUTH_SECRET` | sí | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | sí | Origen público, sin barra final. Ej: `https://pulse.vercel.app` |
| `VITE_AUTH_ENABLED` | sí | `true` |
| `BLOB_READ_WRITE_TOKEN` | recomendada | Token de Vercel Blob para fotos de perfil |

3. El build aplica las migraciones:

```bash
npm run build
```

Equivale a `vite build` + `npm run db:migrate`. Si preferes ejecutar el SQL a mano, corre en este orden:

- `migrations/0001_auth.sql`
- `migrations/0002_pulse.sql`
- `migrations/0003_set_kind.sql`
- `migrations/0004_pulse_v2.sql`
- `migrations/0005_recovery_codes.sql`
- `migrations/0006_pulse_v3.sql`

No hace falta ninguna `SUPABASE_ANON_KEY` ni `sb_secret`. No las añadas: el cliente no las usa y una service role en el navegador sería un agujero de seguridad.

Google y X solo funcionan en el preview de Grok (`*.grok-sandbox.com`), porque el broker de auth no acepta el callback de `*.vercel.app`. En la demo pública entra con **email y contraseña**.

## Tests

```bash
npm test
```

Cubre 1RM (Epley), IMC, Mifflin–St Jeor, Pulse Score, consistencia, puertas de seed demo y validación de avatar.
