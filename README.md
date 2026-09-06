# Pulse

> Tu ritmo. Tu progreso.

Pulse es una aplicación web de fitness diseñada para crear rutinas, registrar entrenamientos y consultar el progreso desde cualquier dispositivo, con una experiencia móvil en modo oscuro y una estética premium.

## Características

- Registro e inicio de sesión con email y contraseña
- Sesiones seguras mediante cookies `HttpOnly`, `Secure` y `SameSite=Lax`
- Creación y gestión de rutinas de entrenamiento
- Registro de ejercicios, series y entrenamientos finalizados
- Historial y seguimiento del progreso
- Persistencia de usuarios y datos de entrenamiento en Neon Postgres
- Despliegue en producción con Vercel
- Interfaz responsive optimizada para móvil
- Inteligencia artificial utilizada como apoyo en la ideación, diseño, implementación y mejora del producto

## Arquitectura

| Área | Tecnología / servicio |
|---|---|
| Frontend | React + Vite + TypeScript |
| Autenticación | Better Auth |
| Base de datos | Neon Postgres |
| Hosting y despliegue | Vercel |
| Sesiones | Cookies seguras del servidor |

## Autenticación y seguridad

Pulse utiliza Better Auth para el flujo de email y contraseña. Las sesiones se gestionan en el servidor y las cookies son la fuente de verdad; no se mantiene un token bearer persistente en `localStorage`.

- Cookies de sesión con prefijo `__Host-`
- Cookies `HttpOnly`, `Secure` y `SameSite=Lax`
- Sesiones persistentes en base de datos
- Cierre de sesión con invalidación de sesión y limpieza de almacenamiento del cliente
- Limitación de intentos por IP para registro e inicio de sesión
- Mensajes de error diferenciados para credenciales incorrectas, email duplicado, red y límite de intentos

## Desarrollo local

### Requisitos

- Node.js 20 o superior
- Una base de datos PostgreSQL compatible, por ejemplo Neon

### Instalación

```bash
git clone <URL_DEL_REPOSITORIO>
cd pulse
npm install
```

### Variables de entorno

Crea un archivo `.env.local` a partir de la configuración de ejemplo y añade tus credenciales:

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=un-secreto-largo-aleatorio
BETTER_AUTH_URL=http://localhost:5173
```

> No subas archivos `.env`, URLs de conexión, secretos, cookies ni tokens al repositorio.

### Ejecutar la aplicación

```bash
npm run dev
```

La aplicación estará disponible normalmente en `http://localhost:5173`.

## Base de datos

La base de datos contiene las tablas de autenticación de Better Auth y las entidades propias de Pulse, incluyendo perfiles, rutinas, ejercicios, entrenamientos y series.

Antes de probar registro o inicio de sesión en un entorno nuevo, aplica las migraciones del proyecto contra la base de datos configurada.

## Despliegue

La aplicación está desplegada en Vercel y utiliza Neon Postgres como almacenamiento persistente de producción.

Para desplegar una copia:

1. Importa el repositorio en Vercel.
2. Crea o conecta una base de datos Neon Postgres.
3. Configura `DATABASE_URL`, `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` para Production.
4. Ejecuta las migraciones sobre la base de producción.
5. Haz un redeploy.

No uses un fallback de base de datos en memoria en producción: los usuarios, sesiones y entrenamientos deben persistir en PostgreSQL.

## Estado del proyecto

Pulse se encuentra en desarrollo activo. La autenticación, persistencia de cuentas, rutinas y entrenamientos están conectadas a producción; continúo mejorando el diseño, la navegación, los modales y la experiencia mobile-first.

## Autor

Desarrollado por Roberto.
