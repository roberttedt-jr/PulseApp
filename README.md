

# Pulse

> **Tu ritmo. Tu progreso.**

Pulse es una aplicación web y móvil de fitness de alto rendimiento orientada a la progresión muscular, el registro inteligente de entrenamientos en tiempo real y el análisis visual de métricas. Diseñada bajo una interfaz móvil con estética *dark mode* premium, combina simplicidad operativa durante la sesión con un ecosistema completo de rutinas, métricas avanzadas y comunidad social.

---

## 📱 Demostración y capturas

### Vídeo de la aplicación

<p align="center">
  <video src="./ScreenRecording_09-07-2026-13-10-37_1-5.MP4" controls width="330" style="max-width: 100%; border-radius: 14px;"></video>
</p>

---

### Módulos principales de la aplicación

| Dashboard & Inicio | Planificador de Rutinas | Progreso & Récords (PRs) |
|:---:|:---:|:---:|
| <img src="./IMG_8920-6.jpg" width="230" alt="Dashboard e Inicio" style="border-radius: 12px;" /> | <img src="./IMG_8922-2.jpg" width="230" alt="Entrenamiento y Rutinas" style="border-radius: 12px;" /> | <img src="./IMG_8923-3.jpg" width="230" alt="Progreso y Récords" style="border-radius: 12px;" /> |

| Feed Social & Comunidad | Biblioteca de Ejercicios |
|:---:|:---:|
| <img src="./IMG_8921.jpg" width="230" alt="Feed Social y Actividad" style="border-radius: 12px;" /> | <img src="./IMG_8924-4.jpg" width="230" alt="Buscador de Ejercicios" style="border-radius: 12px;" /> |

---

## Funcionalidades implementadas

### 1. Panel de control y Dashboard diario
- **Smart Recommendations:** Detección de grupos musculares descansados y avisos contextuales de recuperación.
- **Acceso rápido a sesión libre:** Inicio directo de entrenamientos sin necesidad de plantilla previa.
- **Historial reciente:** Registro visual de la última sesión con métricas de tiempo, volumen acumulado y series.
- **Pulse Score:** Puntuación global del estado y constancia semanal.

### 2. Gestión de entrenamientos y rutinas
- **Modo entrenamiento en vivo:** Registro interactivo de repeticiones, kilos y series efectivas en directo.
- **Plantillas preconfiguradas y personalizadas:** Soporte para rutinas populares (PPL, Upper/Lower, Full Body) y creación desde cero.
- **Planificador semanal:** Asignación de rutinas o días de descanso por cada día de la semana.

### 3. Biblioteca de ejercicios y categorización
- **Buscador interactivo:** Filtrado rápido de ejercicios por nombre.
- **Clasificación por grupo muscular:** Pecho, espalda, hombros, bíceps, tríceps, piernas y core.
- **Clasificación por tipo y equipamiento:** Compuesto, aislamiento, cardio, barra, mancuernas, poleas, máquinas y peso corporal.
- **Sistema de favoritos:** Marcado de ejercicios habituales para acceso inmediato.

### 4. Analítica de progreso y récords personales (PRs)
- **Cálculo de 1RM estimado:** Estimación automática de repetición máxima en base al rendimiento de las series.
- **Detección automática de PRs:** Registro de hitos por peso máximo alcanzado, repeticiones logradas y mayor volumen en una sesión.
- **Resumen semanal:** Conteo de sesiones semanales (objetivo vs realizado), número total de series y tonelaje/volumen levantado.
- **Racha activa:** Medición de días consecutivos y constancia.

### 5. Feed social y perfil de usuario
- **Perfil público interactivo:** Métricas del atleta, recuento de entrenamientos finalizados, seguidores y seguidos.
- **Publicación automática de sesiones:** Compartición de entrenamientos con desglose de duración, volumen y récords batidos.
- **Comparador con amigos:** Espacio para contrastar marcas y estadísticas respetando la privacidad seleccionada por cada usuario.
- **Interacciones:** Sistema de likes y comentarios en entrenamientos de la comunidad.

---

## Arquitectura técnica

| Capa / Servicio | Tecnología | Propósito |
|---|---|---|
| **Frontend** | React 18, Vite, TypeScript | SPA de alto rendimiento optimizada para pantallas táctiles y viewport móvil. |
| **Estilos & UI** | Tailwind CSS | Sistema de diseño dark mode con paleta de acentos neón y contrastes accesibles. |
| **Autenticación** | Better Auth | Flujo seguro de email/contraseña con cookies blindadas en servidor. |
| **Base de datos** | Neon Postgres | Base de datos relacional *serverless* con escalado automático. |
| **Despliegue** | Vercel | Hosting continuo y CI/CD de producción. |

---

## Seguridad y gestión de sesiones

Pulse delega la seguridad en Better Auth con una arquitectura *session-first*:

- **Cookies HttpOnly y Secure:** Las credenciales de sesión viajan protegidas con `SameSite=Lax` y prefijo `__Host-`, evitando ataques XSS.
- **Persistencia en servidor:** No se exponen tokens JWT de larga duración en `localStorage`.
- **Protección contra fuerza bruta:** Rate-limiting por dirección IP en endpoints de login y registro.
- **Manejo de errores seguro:** Mensajes diferenciados ante errores de red, correos duplicados o credenciales incorrectas sin fuga de información interna.

---

## Instalación y ejecución local

### Requisitos previos
- Node.js 20 o superior
- Instancia de PostgreSQL (Neon o local)

### Pasos

1. Clona el repositorio:
   ```bash
   git clone <URL_DE_TU_REPOSITORIO>
   cd pulse
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env.local` en la raíz del proyecto:
   ```env
   DATABASE_URL=postgresql://usuario:password@endpoint.neon.tech/pulse?sslmode=require
   BETTER_AUTH_SECRET=un_secreto_seguro_y_aleatorio
   BETTER_AUTH_URL=http://localhost:5173
   ```

4. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```

---

## Despliegue en producción

La aplicación está lista para desplegarse en **Vercel** enlazada a **Neon Postgres**:

1. Vincula tu repositorio de GitHub en Vercel.
2. Añade las variables de entorno (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) en la configuración de Vercel.
3. Ejecuta las migraciones de esquema en tu base de datos de Neon.


4. Completa el despliegue automático.

---

## Autor

Desarrollado por **Roberto**.
