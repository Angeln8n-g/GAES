export interface ClaroMoodleCoursePreset {
  id: string;
  courseId: string;
  title: string;
  url: string;
  category: string;
  suggestedTechnicalCategory: string;
  description: string;
}

export const CLARO_MOODLE_PRESETS: ClaroMoodleCoursePreset[] = [
  {
    id: 'moodle-180',
    courseId: '180',
    title: '01 - Instalación y Reparación Voz',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=180',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Planta Externa',
    description: 'Fundamentos de telefonía básica, bucle de abonado, normativas de conexión y cableado de voz.'
  },
  {
    id: 'moodle-140',
    courseId: '140',
    title: '02 - Instalación y Reparación Voz',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=140',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Planta Externa',
    description: 'Diagnóstico de averías, parámetros de línea de cobre, pruebas con microteléfono y mantenimiento de pares.'
  },
  {
    id: 'moodle-138',
    courseId: '138',
    title: '04 - Instalación y Reparación Voz',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=138',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Planta Externa',
    description: 'Protocolos avanzados de telefonía analógica, distribución en armarios y centrales locales.'
  },
  {
    id: 'moodle-190',
    courseId: '190',
    title: '05 - Internet (Fast-Track)',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=190',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Fibra Óptica & FTTx',
    description: 'Aprovisionamiento acelerado de banda ancha residencial, configuración de terminales y ONT GPON.'
  },
  {
    id: 'moodle-184',
    courseId: '184',
    title: '06 - Internet',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=184',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Redes IP, Routing & Switching',
    description: 'Configuración de módems y routers, direccionamiento IP, DHCP, NAT y resolución de problemas LAN/WAN.'
  },
  {
    id: 'moodle-176',
    courseId: '176',
    title: '07 - Internet',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=176',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Redes IP, Routing & Switching',
    description: 'Parámetros de modulación, perfiles de velocidad y pruebas de rendimiento de ancho de banda.'
  },
  {
    id: 'moodle-175',
    courseId: '175',
    title: '08 - Internet',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=175',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Red HFC & Coaxial',
    description: 'Sistemas DOCSIS en redes HFC, calibración de niveles RF y retorno de cable módem.'
  },
  {
    id: 'moodle-171',
    courseId: '171',
    title: '09 - Internet',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=171',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Redes IP, Routing & Switching',
    description: 'Soporte técnico avanzado de enlaces dedicados y configuración de equipos CPE.'
  },
  {
    id: 'moodle-174',
    courseId: '174',
    title: '10 - Internet',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=174',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Fibra Óptica & FTTx',
    description: 'Mediciones de potencia óptica, pérdidas en conectores SC/APC y empalmes por fusión.'
  },
  {
    id: 'moodle-170',
    courseId: '170',
    title: '11 - Internet',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=170',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Redes IP, Routing & Switching',
    description: 'Seguridad en redes WiFi residenciales, cifrado WPA3 y aislamiento de clientes.'
  },
  {
    id: 'moodle-4',
    courseId: '4',
    title: '12 - Internet',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=4',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Redes IP, Routing & Switching',
    description: 'Módulo integral de conectividad corporativa y aseguramiento de servicio IP.'
  },
  {
    id: 'moodle-281',
    courseId: '281',
    title: '12 - Claro TV+',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=281',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Servicio al Cliente & Instalaciones',
    description: 'Arquitectura del ecosistema Claro TV+, instalación del dongle/decodificador y configuración inicial.'
  },
  {
    id: 'moodle-185',
    courseId: '185',
    title: '13 - Claro TV+',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=185',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Servicio al Cliente & Instalaciones',
    description: 'Operación del sistema IPTV Claro TV+, vinculación de cuentas y diagnóstico de streaming.'
  },
  {
    id: 'moodle-183',
    courseId: '183',
    title: '14 - Claro TV+',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=183',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Servicio al Cliente & Instalaciones',
    description: 'Mantenimiento correctivo de cajas Claro TV+, resolución de fallas de audio, video y sincronización.'
  },
  {
    id: 'moodle-177',
    courseId: '177',
    title: '16 - Claro TV+',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=177',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Servicio al Cliente & Instalaciones',
    description: 'Técnicas avanzadas de optimización de red local para streaming multimedia continuo.'
  },
  {
    id: 'moodle-189',
    courseId: '189',
    title: 'Instalación De Solución Mesh Con ZTE',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=189',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Redes IP, Routing & Switching',
    description: 'Topologías en malla WiFi Mesh con nodos ZTE, itinerancia sin cortes (Roaming 802.11k/v/r).'
  },
  {
    id: 'moodle-187',
    courseId: '187',
    title: 'Prevención y Seguridad en el Área de Trabajo',
    url: 'https://entrenamiento.claro.com.do/course/view.php?id=187',
    category: 'Entrenamientos Técnicos',
    suggestedTechnicalCategory: 'Seguridad Operativa & Altura',
    description: 'Prevención de riesgos laborales, protocolo de trabajos en altura, uso de arnés, escaleras y EPP.'
  }
];

export const CLARO_MOODLE_BASE_URL = 'https://entrenamiento.claro.com.do';
export const CLARO_MOODLE_TECHNICAL_CAT_URL = 'https://entrenamiento.claro.com.do/course/index.php?categoryid=1';
