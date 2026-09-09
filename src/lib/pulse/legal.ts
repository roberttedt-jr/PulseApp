export type LegalDocId = "terms" | "privacy" | "cookies" | "comunidad";

export type LegalSection = {
  title: string;
  body: string[];
};

export const LEGAL_UPDATED = "9 de septiembre de 2026";

export const TERMS_TITLE = "Términos y condiciones";
export const PRIVACY_TITLE = "Política de privacidad";
export const COOKIES_TITLE = "Política de cookies";
export const COMMUNITY_TITLE = "Normas de la comunidad";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "1. Objeto y servicio",
    body: [
      "Pulse es una aplicación de entrenamiento diseñada para el registro de sesiones deportivas, series, cargas, repeticiones, marcas personales (PR) y rutinas de ejercicio físico.",
      "Pulse ofrece además funciones opcionales para compartir entrenamientos en el feed de actividad y seguir a otros atletas.",
      "El acceso y uso de Pulse implica la aceptación plena de estos términos. Si no estás de acuerdo con alguna de sus condiciones, no debes utilizar la aplicación.",
    ],
  },
  {
    title: "2. Titularidad del servicio",
    body: [
      "El servicio Pulse es prestado y gestionado por [Nombre o razón social del responsable], con NIF/CIF [NIF/CIF, si aplica] y domicilio de contacto en [Domicilio de contacto, si aplica].",
      "Para cualquier consulta o comunicación relacionada con estos términos o el funcionamiento de la aplicación, puedes escribir a [Email de privacidad] (canal de contacto pendiente de confirmación formal).",
    ],
  },
  {
    title: "3. Cuenta y seguridad",
    body: [
      "Para utilizar las funciones de registro de entrenamiento y sincronización en la nube es necesario crear una cuenta proporcionando un correo electrónico verídico y una contraseña segura.",
      "Cada usuario es responsable de salvaguardar la confidencialidad de sus credenciales de acceso y de los códigos de recuperación que genere en su dispositivo.",
      "El identificador de atleta (@usuario) es único dentro de la plataforma. Queda prohibido elegir identificadores que suplanten a terceras personas, marcas registradas o al propio equipo de Pulse.",
    ],
  },
  {
    title: "4. Contenido generado por el usuario",
    body: [
      "Conservas en todo momento la titularidad y los derechos de propiedad sobre los entrenamientos, registros, notas, textos y fotografías que subas a Pulse.",
      "Al registrar o publicar contenido, concedes a Pulse una licencia técnica de ámbito mundial, no exclusiva y gratuita, limitada estrictamente a alojar, procesar, sincronizar y mostrar dicho contenido según el nivel de visibilidad que configures («Solo yo», «Seguidores» o «Público»).",
      "No está permitido publicar contenidos ilícitos, lesivos, ofensivos, o que infrinjan derechos de terceros o secretos comerciales.",
    ],
  },
  {
    title: "5. Salud y responsabilidad física",
    body: [
      "Pulse es una herramienta tecnológica de apoyo al registro del entrenamiento físico. Pulse no es un centro de salud, no presta servicios médicos ni clínicos, no emite diagnósticos y no sustituye en ningún caso la consulta, supervisión o prescripción de un profesional sanitario, médico deportivo o fisioterapeuta.",
      "Las estimaciones de volumen, marcas teóricas de 1RM, correlaciones de carga o gasto calórico son cálculos orientativos aproximados basados en los datos que introduces voluntariamente.",
      "El usuario asume voluntariamente el riesgo inherente a la práctica de ejercicio físico con cargas y se compromete a entrenar con prudencia y de acuerdo a sus capacidades individuales.",
    ],
  },
  {
    title: "6. Moderación y cancelación",
    body: [
      "Pulse se reserva el derecho de supervisar el uso del servicio, moderar o retirar contenidos que vulneren estos términos o las Normas de la Comunidad, y limitar, suspender temporalmente o cancelar de forma definitiva cuentas infractoras.",
      "El usuario puede solicitar el cierre de su cuenta y la supresión de sus datos de entrenamiento en cualquier momento desde la sección de Ajustes de la aplicación.",
    ],
  },
  {
    title: "7. Modificaciones y legislación aplicable",
    body: [
      "Podemos actualizar estos términos para adaptarlos a novedades técnicas o legislativas. Las modificaciones se publicarán en esta sección indicando la fecha de última revisión.",
      "Estos términos y cualquier controversia derivada del uso de la aplicación se rigen por la legislación vigente en [Jurisdicción aplicable], sin perjuicio de los derechos imperativos que asistan al consumidor.",
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "1. Responsable del tratamiento",
    body: [
      "El responsable del tratamiento de los datos personales recogidos a través de Pulse es [Nombre o razón social del responsable], con NIF/CIF [NIF/CIF, si aplica] y domicilio en [Domicilio de contacto, si aplica].",
      "Punto de contacto para cuestiones de privacidad y ejercicio de derechos: [Email de privacidad] (contacto de privacidad pendiente de confirmación formal).",
    ],
  },
  {
    title: "2. Datos personales recabados",
    body: [
      "Datos de registro y cuenta: Dirección de correo electrónico, hash criptográfico de contraseña (gestionado mediante Better Auth con algoritmos seguros), nombre de atleta y @usuario.",
      "Datos de actividad deportiva: Sesiones de entrenamiento, series, repeticiones, cargas (en kilogramos o libras), esfuerzo percibido (RPE/RIR), descansos entre series, notas de sesión y marcas personales alcanzadas.",
      "Datos opcionales de perfil: Fecha de nacimiento, sexo, peso corporal, estatura, objetivo de entrenamiento y nivel de experiencia. Estos datos solo se tratan si decides completarlos voluntariamente en tu perfil.",
      "Datos de interacción social: Publicaciones en el feed, comentarios, valoraciones («me gusta»), solicitudes de seguimiento, usuarios seguidos, seguidores, bloqueos y reportes.",
      "Datos técnicos esenciales: Identificadores de sesión, registros mínimos de seguridad y tokens de autenticación para posibilitar el inicio de sesión y el funcionamiento seguro.",
    ],
  },
  {
    title: "3. Finalidades y bases de legitimación",
    body: [
      "Ejecución del contrato / prestación del servicio: Gestionar el alta del usuario, autenticar sus sesiones, registrar su progreso atlético, sincronizar su historial y permitirle compartir contenido con su red según su configuración de privacidad.",
      "Consentimiento del interesado: Tratamiento de los datos opcionales de perfil (peso, estatura, objetivos) y publicación de contenido en el feed social para otros usuarios.",
      "Interés legítimo: Garantizar la seguridad de la infraestructura, prevenir accesos no autorizados, abuso o spam, y corregir errores técnicos del servicio.",
      "Cumplimiento de obligaciones legales: Atención de requerimientos de autoridades competentes y gestión de solicitudes de derechos.",
    ],
  },
  {
    title: "4. Proveedores y encargados de tratamiento",
    body: [
      "Para prestar el servicio, Pulse contrata con proveedores tecnológicos que actúan como encargados de tratamiento bajo contratos conformes con la normativa de protección de datos:",
      "• Vercel Inc.: Proveedor de infraestructura de alojamiento web, CDN y funciones serverless.",
      "• Neon Inc.: Proveedor de base de datos relacional PostgreSQL serverless en la nube.",
      "• Better Auth: Marco de gestión de autenticación, control de sesiones seguras y verificación criptográfica de credenciales.",
      "Pulse no vende ni alquila datos personales a intermediarios, plataformas publicitarias ni redes de captación comercial.",
    ],
  },
  {
    title: "5. Plazos de conservación",
    body: [
      "Los datos se conservan mientras la cuenta de usuario permanezca activa en la plataforma.",
      "Si el usuario decide eliminar su cuenta mediante la opción disponible en Ajustes, sus datos de perfil, rutinas, series y publicaciones se suprimen o anonimizan de forma segura, manteniéndose únicamente bloqueados aquellos datos estrictamente requeridos para la atención de responsabilidades legales durante los plazos legalmente prescritos.",
    ],
  },
  {
    title: "6. Derechos de las personas usuarias",
    body: [
      "Como usuario, puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión («derecho al olvido»), limitación del tratamiento, portabilidad de tus datos y oposición.",
      "Para ejercer estos derechos, puedes remitir una solicitud por correo electrónico a [Email de privacidad]. Tienes asimismo derecho a presentar una reclamación ante la autoridad de control en materia de protección de datos competente.",
    ],
  },
];

export const COOKIES_SECTIONS: LegalSection[] = [
  {
    title: "1. Qué son las cookies y qué tecnologías emplea Pulse",
    body: [
      "Las cookies y tecnologías de almacenamiento local (como localStorage) son pequeños ficheros de datos que se almacenan en tu dispositivo al visitar una aplicación web para permitir el funcionamiento de las sesiones y recordar ajustes técnicos.",
    ],
  },
  {
    title: "2. Tecnologías técnicas esenciales empleadas en Pulse",
    body: [
      "Pulse utiliza exclusivamente tecnologías de almacenamiento técnico estrictamente necesarias para prestar el servicio solicitado por el usuario:",
      "• better-auth.session_token / cabeceras de autorización: Cookie o token criptográfico emitido por el sistema de autenticación para mantener tu sesión iniciada de forma segura entre navegaciones.",
      "• pulse_session_token (localStorage): Token de sesión en almacenamiento local para asegurar la continuidad de navegación y el modo aplicación.",
      "• pulse_recovery_* (localStorage): Almacenamiento local temporal del código de recuperación generado en el dispositivo para posibilitar el restablecimiento de acceso en caso de olvido de contraseña.",
      "• Preferencias técnicas locales: Almacenamiento de configuraciones de interfaz como las unidades de peso seleccionadas (kg/lb) y el sonido de aviso al finalizar el temporizador de descanso.",
    ],
  },
  {
    title: "3. Ausencia de cookies analíticas o publicitarias",
    body: [
      "Pulse no utiliza cookies publicitarias, cookies de seguimiento de terceros, perfiles comerciales ni tecnologías analíticas invasivas.",
      "Dado que todas las tecnologías empleadas son de carácter técnico y estrictamente necesarias para el suministro del servicio solicitado por el propio atleta, no requieren el consentimiento publicitario previo de acuerdo con la legislación aplicable.",
    ],
  },
  {
    title: "4. Control y desactivación en el navegador",
    body: [
      "Puedes configurar tu navegador web (Safari, Chrome, Firefox, Edge) para bloquear o eliminar las cookies en cualquier momento. Ten en cuenta que, si bloqueas las cookies técnicas necesarias, la aplicación no podrá mantener tu sesión iniciada y las funciones de entrenamiento sincronizado no estarán disponibles.",
    ],
  },
];

export const COMMUNITY_SECTIONS: LegalSection[] = [
  {
    title: "1. Compromiso de respeto y espíritu deportivo",
    body: [
      "Pulse es una comunidad concebida para motivar el progreso deportivo, el esfuerzo personal y el aprendizaje mutuo. Esperamos que cada interacción con otros atletas se base en el respeto, la cordialidad y el espíritu constructivo.",
    ],
  },
  {
    title: "2. Conductas prohibidas: acoso, spam y suplantación",
    body: [
      "Queda expresamente prohibido:",
      "• Cualquier forma de acoso, intimidación, hostigamiento, insulto o lenguaje discriminatorio por razones de género, raza, orientación, religión o físico.",
      "• La publicación de comentarios publicitarios no solicitados (spam), enlaces comerciales no autorizados o esquemas fraudulentos.",
      "• La suplantación de identidad de otros atletas, entrenadores, personalidades públicas o miembros del equipo de desarrollo de Pulse.",
    ],
  },
  {
    title: "3. Protección de la privacidad de terceros",
    body: [
      "No está permitido publicar imágenes, grabaciones, marcas o datos de carácter personal de terceros sin su consentimiento explícito y previo, especialmente en instalaciones deportivas y gimnasios donde rigen normas específicas de privacidad.",
    ],
  },
  {
    title: "4. Veracidad y uso responsable de las funciones sociales",
    body: [
      "Al compartir marcas, rutinas o fotografías de entrenamiento en el feed de actividad, los atletas se comprometen a hacerlo de buena fe y con contenido legítimo de su autoría.",
      "Queda terminantemente prohibida la subida de contenido explícito, pornográfico, violento o que atente contra la integridad moral de los participantes.",
    ],
  },
  {
    title: "5. Herramientas de reporte y bloqueo",
    body: [
      "Pulse pone a disposición de todos los usuarios herramientas directas de protección:",
      "• Bloqueo de usuarios: Puedes bloquear a cualquier usuario desde su perfil público. El usuario bloqueado no podrá seguirte, no verá tus publicaciones ni podrá interactuar contigo en la aplicación.",
      "• Reporte de publicaciones: Puedes reportar publicaciones que incumplan estas normas mediante la opción de reporte en el feed.",
    ],
  },
  {
    title: "6. Advertencia médica",
    body: [
      "Pulse no proporciona supervisión clínica ni consejo médico. Las marcas, cargas y recomendaciones compartidas por otros usuarios de la comunidad responden a sus características particulares y no deben tomarse como pautas médicas aplicables a otros atletas.",
    ],
  },
  {
    title: "7. Moderación y medidas ante incumplimientos",
    body: [
      "El equipo de Pulse revisa las alertas y reportes de la comunidad. Nos reservamos la facultad de advertir a usuarios, eliminar publicaciones infractoras y restringir, suspender o cancelar cuentas de forma cautelar o definitiva en caso de infracciones graves o reiteradas.",
    ],
  },
];

export function getLegalDoc(id: string | undefined): { id: LegalDocId; title: string; sections: LegalSection[] } | null {
  if (!id) return null;
  const key = id.toLowerCase();
  if (key === "terms" || key === "terminos") return { id: "terms", title: TERMS_TITLE, sections: TERMS_SECTIONS };
  if (key === "privacy" || key === "privacidad") return { id: "privacy", title: PRIVACY_TITLE, sections: PRIVACY_SECTIONS };
  if (key === "cookies") return { id: "cookies", title: COOKIES_TITLE, sections: COOKIES_SECTIONS };
  if (key === "comunidad" || key === "community") return { id: "comunidad", title: COMMUNITY_TITLE, sections: COMMUNITY_SECTIONS };
  return null;
}
