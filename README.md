# ⚡ Pulse — Fitness & Progressive Overload Tracker

<div align="center">

### **Tu ritmo. Tu progreso.**

[![React 18](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL Neon](https://img.shields.io/badge/Neon_Postgres-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-1.6-black?style=for-the-badge&logo=auth0&logoColor=white)](https://www.better-auth.com/)
[![TanStack Router](https://img.shields.io/badge/TanStack_Router-1.170-FF4154?style=for-the-badge&logo=react-router&logoColor=white)](https://tanstack.com/router)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

[Demostración y Capturas](#-demostración-y-capturas) • [Características](#-funcionalidades-principales) • [Arquitectura Técnica](#-arquitectura-técnica) • [Instalación Local](#-instalación-y-ejecución-local) • [Estructura del Proyecto](#-estructura-del-proyecto)

</div>

---

## 📖 Sobre Pulse

**Pulse** es una aplicación web y móvil de fitness de alto rendimiento orientada a la **sobrecarga progresiva**, el registro inteligente de entrenamientos en tiempo real y el análisis visual de métricas corporales y de fuerza. 

Diseñada bajo una interfaz móvil con estética *Dark Mode* premium, combina simplicidad y ergonomía táctil durante la sesión con un ecosistema avanzado de cálculo de 1RM, detección automática de récords personales (PRs), planificador semanal y feed social con comparador entre atletas.

---

## 📱 Demostración y Capturas

### Vídeo de la Aplicación en Funcionamiento

<div align="center">

https://github.com/user-attachments/assets/b489c60d-0cdb-4cd0-9261-298d53310757

</div>

---

### Módulos Principales de la Interfaz

| Dashboard & Inicio | Feed Social & Actividad | Progreso & Récords (PRs) |
|:---:|:---:|:---:|
| ![Dashboard e Inicio](./IMG_8920.PNG) | ![Feed Social y Actividad](./IMG_8922.PNG) | ![Progreso y Récords](./IMG_8923.PNG) |

| Entrenamiento & Rutinas | Perfil de Atleta |
|:---:|:---:|
| ![Entrenamiento y Rutinas](./IMG_8921.PNG) | ![Perfil de Usuario](./IMG_8924.PNG) |

---

## ✨ Funcionalidades Principales

### 1. Panel de Control y Dashboard Diario
- **Smart Recommendations:** Detección contextual de grupos musculares descansados y avisos inteligentes de recuperación biológica.
- **Sesión Rápida Libre:** Inicio de entrenamientos sin plantilla previa en un solo toque con selector dinámico de ejercicios.
- **Pulse Score:** Algoritmo que puntúa la constancia, volumen e intensidad semanal.
- **Historial Reciente:** Resumen visual de la última sesión con métricas de tiempo transcurrido, tonelaje total y series efectivas.

### 2. Gestión de Entrenamientos y Rutinas
- **Modo Entrenamiento en Vivo:** Registro interactivo de repeticiones, kilos, RPE y series efectivas con temporizador de descanso integrado.
- **Plantillas Preconfiguradas & Custom:** Soporte nativo para rutinas populares (*Push-Pull-Legs*, *Upper-Lower*, *Full Body*, *Torso-Pierna*) y creador libre con ordenación drag-and-drop mediante `@dnd-kit`.
- **Planificador Semanal:** Asignación visual de rutinas o días de descanso activo para cada día de la semana.

### 3. Biblioteca Completa de Ejercicios
- **Buscador Reactivo:** Búsqueda en tiempo real por nombre, grupo muscular y variantes.
- **Clasificación por Grupo Muscular:** Pecho, espalda, hombros, bíceps, tríceps, cuádriceps, femorales, glúteos y core.
- **Filtro por Equipamiento:** Barra olímpica, mancuernas, poleas ajustables, máquinas de placas, peso corporal y cardio.
- **Colección de Favoritos:** Acceso prioritario a los ejercicios más utilizados por el usuario.

### 4. Analítica de Progreso y Récords Personales (PRs)
- **Cálculo de 1RM Estimado:** Estimación automática en base a las fórmulas de Epley, Brzycki y Lander.
- **Detección Automática de Hitos:** Registro inmediato de récords por peso máximo levantado, mayor repetición por carga y mayor volumen de sesión.
- **Analítica Semanal y Racha Activa:** Gráficos de tonelaje acumulado, número de series por grupo muscular y contador de días consecutivos.

### 5. Feed Social y Perfil de Usuario
- **Perfil de Atleta:** Métricas acumuladas, total de entrenamientos finalizados, seguidores y seguidos.
- **Publicación Automática:** Compartición de sesiones al finalizar el entrenamiento con desglose de series y nuevos récords conseguidos.
- **Comparador con Amigos:** Contraste de marcas y estadísticas de fuerza respetando los ajustes de privacidad seleccionados.
- **Interacciones:** Sistema de likes y comentarios en tiempo real.

---

## 🏗️ Arquitectura Técnica

```
┌─────────────────────────────────────────────────────────┐
│                    Pulse Frontend                       │
│    React 18 + Vite + TypeScript + Tailwind CSS v4       │
│    • TanStack Router (Navegación tipo App Nativa)       │
│    • TanStack Query (Caché y sincronización reactiva)   │
│    • Radix UI Primitives + Lucide Icons + dnd-kit       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │  HTTPS / JSON API
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Capa de Seguridad & API                 │
│    Better Auth (Session-first, Cookies HttpOnly Secure) │
│    • Rate Limiting por IP contra fuerza bruta           │
│    • Sin exposición de JWTs en localStorage             │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │  PostgreSQL Connection Pool
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Almacenamiento & BD                   │
│    • Neon PostgreSQL (Base de datos relacional Cloud)   │
│    • PGlite (ElectricSQL para persistencia en cliente)  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔒 Seguridad y Gestión de Sesiones

Pulse delega la seguridad en **Better Auth** implementando una arquitectura *session-first*:

- **Cookies HttpOnly y Secure:** Las credenciales y tokens de sesión viajan protegidas con directivas `SameSite=Lax` y prefijo `__Host-`, neutralizando vectores de ataque XSS y robo de tokens.
- **Sin JWTs en LocalStorage:** Toda validación se resuelve contra el servidor de sesión o réplica autorizada.
- **Rate-Limiting Robusto:** Mitigación activa contra ataques de fuerza bruta en endpoints de autenticación y registro.
- **Sanitización de Datos:** Prevención de fugas de información interna en respuestas de error de base de datos.

---

## 📁 Estructura del Proyecto

```text
pulse/
├── migrations/               # Scripts de migración SQL para PostgreSQL
├── public/                   # Activos estáticos, manifest y fuentes
├── scripts/                  # Scripts de utilidades, entorno y migración de BD
├── server/                   # Lógica de servidor y endpoints Better Auth
├── src/
│   ├── components/           # Componentes UI (modales, selector de ejercicios, tarjetas)
│   ├── hooks/                # Hooks personalizados de React (entrenamientos, temporizador)
│   ├── lib/
│   │   ├── auth/             # Configuración y guardas de autenticación
│   │   ├── pulse/            # Fórmulas de 1RM, PRs, métricas y HealthKit
│   │   └── db/               # Conexión con PostgreSQL / PGlite
│   ├── routes/               # Rutas de la aplicación (TanStack Router)
│   └── styles/               # Tokens de diseño y utilidades de Tailwind CSS
├── vite.config.ts            # Configuración de Vite y plugins de TanStack
├── tsconfig.json             # Configuración de TypeScript
└── package.json              # Dependencias y scripts de ejecución
```

---

## 🚀 Instalación y Ejecución Local

### 1. Prerrequisitos
- [Node.js](https://nodejs.org/) v20 o superior.
- Instancia de PostgreSQL (recomendado: [Neon](https://neon.tech/) o PostgreSQL local).

### 2. Clonar el Repositorio
```bash
git clone https://github.com/roberttedt-jr/pulse.git
cd pulse
```

### 3. Instalar Dependencias
```bash
npm install
```

### 4. Configurar Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://usuario:password@ep-ejemplo.neon.tech/pulse?sslmode=require"
BETTER_AUTH_SECRET="genera_una_clave_secreta_segura_de_32_caracteres"
BETTER_AUTH_URL="http://localhost:8080"
```

### 5. Ejecutar Migraciones de Base de Datos
```bash
npm run db:migrate
```

### 6. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
Accede a [http://localhost:8080](http://localhost:8080) en tu navegador.

### 7. Comprobación de Tipos y Tests
```bash
# Validar tipado TypeScript
npm run typecheck

# Ejecutar suite de pruebas unitarias
npm test

# Compilar para producción
npm run build
```

---

## 🌐 Despliegue en Producción

Pulse está diseñado para desplegarse de forma continua en [Vercel](https://vercel.com/) con base de datos en [Neon](https://neon.tech/):

1. Conecta el repositorio de GitHub en el panel de Vercel.
2. Configura las variables de entorno (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`).
3. Vercel ejecutará automáticamente la compilación (`npm run build`) y el despliegue a la red Edge global.

---

## 📜 Licencia y Autor

© 2026 **Pulse**. Desarrollado y mantenido por [Roberto Tedt](https://github.com/roberttedt-jr).

Distribuido bajo la licencia [MIT](LICENSE).
