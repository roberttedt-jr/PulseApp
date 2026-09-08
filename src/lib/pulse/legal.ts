export type LegalDocId = "terms" | "privacy";

export type LegalSection = {
  title: string;
  body: string[];
};

export const LEGAL_UPDATED = "8 de septiembre de 2026";

export const TERMS_TITLE = "Términos y condiciones";
export const PRIVACY_TITLE = "Política de privacidad";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "1. Qué es Pulse",
    body: [
      "Pulse es una aplicación de entrenamiento que te permite registrar sesiones, crear rutinas, seguir tu progreso y, si lo deseas, compartir actividad con otras personas.",
      "Al crear una cuenta o usar Pulse aceptas estos términos. Si no estás de acuerdo, no uses la aplicación.",
    ],
  },
  {
    title: "2. Cuenta",
    body: [
      "Debes proporcionar datos veraces y mantener la confidencialidad de tu contraseña y de cualquier código de recuperación.",
      "El @usuario es único y público dentro de Pulse. No elijas un identificador que suplante a otra persona o a Pulse.",
      "Eres responsable de la actividad que ocurra con tu cuenta. Avísanos si sospechas un acceso no autorizado.",
    ],
  },
  {
    title: "3. Uso permitido",
    body: [
      "Puedes usar Pulse para registrar y organizar tu propio entrenamiento y para interactuar de forma respetuosa con otros atletas.",
      "No está permitido acosar, suplantar, publicar contenido ilegal, intentar acceder a cuentas ajenas, extraer datos de forma masiva ni interferir con el servicio.",
      "Pulse puede limitar, suspender o eliminar una cuenta si incumple estos términos o pone en riesgo a otras personas.",
    ],
  },
  {
    title: "4. Contenido que publicas",
    body: [
      "Sigues siendo titular de tus entrenamientos, fotos, textos y perfil. Nos concedes una licencia limitada para almacenarlos y mostrarlos según la visibilidad que elijas (solo tú, seguidores o público).",
      "No publiques datos de salud de terceras personas ni información que no tengas derecho a compartir.",
      "Puedes dejar de compartir o borrar contenido y, si lo pides, eliminar tu cuenta y los datos asociados al entrenamiento.",
    ],
  },
  {
    title: "5. Salud y entrenamiento",
    body: [
      "Pulse es una herramienta de registro. No es un servicio médico, no diagnostica y no sustituye el consejo de un profesional sanitario o de un entrenador cualificado.",
      "Las calorías, el IMC, las comparativas y los avisos de volumen son estimaciones informativas basadas en lo que tú registras. Entrena con criterio y consulta a un profesional si tienes dudas sobre tu salud.",
    ],
  },
  {
    title: "6. Disponibilidad",
    body: [
      "Intentamos que Pulse esté disponible de forma continua, pero pueden existir cortes, mantenimiento o cambios de funciones.",
      "No garantizamos que una función concreta se mantenga para siempre. Si retiramos una parte del producto, avisaremos cuando sea razonable.",
    ],
  },
  {
    title: "7. Responsabilidad",
    body: [
      "Pulse se ofrece «tal cual». En la medida que permite la ley aplicable, no respondemos de daños indirectos, pérdida de datos por un uso incorrecto o lesiones derivadas del entrenamiento.",
      "Nada en estos términos limita derechos que no se puedan excluir por ley, especialmente si eres una persona consumidora en la Unión Europea.",
    ],
  },
  {
    title: "8. Cambios",
    body: [
      "Podemos actualizar estos términos para reflejar cambios en el producto o en la ley. La fecha de actualización aparece al inicio del documento.",
      "Si el cambio es relevante, lo indicaremos en la aplicación. El uso continuado después de la actualización implica que aceptas la nueva versión.",
    ],
  },
  {
    title: "9. Contacto",
    body: [
      "Pulse es un producto diseñado por Roberto. Para dudas sobre estos términos o sobre tu cuenta, usa el correo asociado a tu perfil o el canal de contacto publicado en la aplicación.",
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "1. Responsable",
    body: [
      "El responsable del tratamiento de los datos de Pulse es el operador de la aplicación (Pulse / Roberto).",
      "Tratamos los datos para prestar el servicio de registro de entrenamiento, cuenta, comunidad y soporte.",
    ],
  },
  {
    title: "2. Qué datos recogemos",
    body: [
      "Cuenta: correo, contraseña en forma de hash, nombre visible, @usuario, foto de perfil y preferencias (unidades, descansos, visibilidad).",
      "Entrenamiento: rutinas, sesiones, series, pesos, repeticiones, RIR/RPE, fotos que subas y marcas personales.",
      "Perfil opcional: fecha de nacimiento, sexo, peso, altura, objetivo y nivel. Estos campos solo se usan si tú los rellenas.",
      "Social: follows, comentarios, publicaciones, bloqueos y reportes.",
      "Técnicos: identificadores de sesión, registros de seguridad y datos mínimos del dispositivo necesarios para que la PWA funcione.",
    ],
  },
  {
    title: "3. Para qué los usamos",
    body: [
      "Crear y mantener tu cuenta, guardar tu historial y mostrar tu progreso.",
      "Permitir que otras personas te encuentren por nombre o @usuario, según la visibilidad que configures.",
      "Enviar avisos dentro de la app (me gusta, comentarios, solicitudes de seguimiento).",
      "Proteger el servicio frente a abuso, spam o accesos no autorizados.",
      "No vendemos tus datos a terceros con fines publicitarios.",
    ],
  },
  {
    title: "4. Base legal",
    body: [
      "La ejecución del contrato (prestar Pulse) cubre cuenta, sesiones, rutinas y funciones sociales que activas.",
      "El consentimiento cubre datos opcionales de perfil y cualquier integración que conectes, como Apple Salud, si está disponible.",
      "El interés legítimo cubre seguridad, prevención de abuso y mejora operativa del producto, siempre de forma proporcionada.",
    ],
  },
  {
    title: "5. Con quién se comparte",
    body: [
      "Tú decides quién ve tu perfil y tus entrenamientos: solo tú, tus seguidores o cualquiera en Pulse.",
      "Usamos proveedores técnicos imprescindibles para alojar la base de datos, servir la aplicación y almacenar archivos. Tratan los datos por nuestra cuenta y no para sus propios fines comerciales.",
      "No indexamos tu correo en el buscador de personas. Nadie puede encontrarte por email.",
    ],
  },
  {
    title: "6. Conservación",
    body: [
      "Conservamos tu cuenta y tu historial mientras la cuenta esté activa.",
      "Si borras la cuenta, eliminamos o anonimizamos los datos de entrenamiento y perfil asociados, salvo lo que debamos conservar por obligación legal o para defender un reclamo.",
      "Los reportes de abuso pueden conservarse un tiempo limitado para seguridad de la comunidad.",
    ],
  },
  {
    title: "7. Tus derechos",
    body: [
      "Puedes acceder, rectificar o actualizar tus datos desde Ajustes.",
      "Puedes solicitar la eliminación de la cuenta con la opción «Borrar cuenta».",
      "Si estás en la Unión Europea también puedes solicitar portabilidad, limitar el tratamiento u oponerte en los casos previstos por el RGPD, y presentar una reclamación ante la autoridad de protección de datos de tu país (en España, la AEPD).",
    ],
  },
  {
    title: "8. Menores",
    body: [
      "Pulse no está dirigida a menores de 16 años. Si descubrimos una cuenta de un menor sin el consentimiento exigido por la ley aplicable, la eliminaremos.",
    ],
  },
  {
    title: "9. Seguridad",
    body: [
      "Usamos conexiones cifradas, contraseñas almacenadas como hash y controles de sesión.",
      "Ningún sistema es infalible. Si detectas un incidente que afecte a tu cuenta, cámbiala y contáctanos.",
    ],
  },
  {
    title: "10. Cambios",
    body: [
      "Si actualizamos esta política, cambiaremos la fecha de revisión y, si el cambio es relevante, lo indicaremos en la aplicación.",
    ],
  },
];

export function getLegalDoc(id: string | undefined): { id: LegalDocId; title: string; sections: LegalSection[] } | null {
  if (id === "terms" || id === "terminos") return { id: "terms", title: TERMS_TITLE, sections: TERMS_SECTIONS };
  if (id === "privacy" || id === "privacidad") return { id: "privacy", title: PRIVACY_TITLE, sections: PRIVACY_SECTIONS };
  return null;
}
