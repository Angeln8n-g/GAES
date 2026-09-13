// =========================================================================
// CATÁLOGO OFICIAL DE PROGRAMAS, SUBPROGRAMAS Y CLASIFICACIONES FORMATIVAS
// SISTEMA DE SUSTENTABILIDAD Y CAPACITACIÓN CORPORATIVA CLARO
// =========================================================================

export interface SustainabilityProgramDef {
  id: string;
  name: string;
  shortName: string;
  iconName?: string;
  subprograms: string[];
}

export const SUSTAINABILITY_PROGRAMS: SustainabilityProgramDef[] = [
  {
    id: 'Capacitacion_comercial_atencion_clientes_marketing',
    name: 'Capacitación Comercial, Atención a Clientes & Marketing',
    shortName: 'Comercial & Clientes',
    subprograms: [
      'Atención a clientes',
      'Capacitación comercial',
      'Marketing'
    ]
  },
  {
    id: 'Capacitacion_tecnologica_digital',
    name: 'Capacitación Tecnológica & Digital',
    shortName: 'Tecnología & Digital',
    subprograms: [
      'Base de datos',
      'Desarrollo de software',
      'Habilidades digitales',
      'Seguridad informática',
      'Sistema operativo',
      'Telecomunicaciones',
      'Transformación digital'
    ]
  },
  {
    id: 'Capacitacion_corporativa',
    name: 'Capacitación Corporativa',
    shortName: 'Corporativa',
    subprograms: [
      'Calidad - sistema de gestión integrado',
      'Competencias generales',
      'Finanzas',
      'Metodologías ágiles',
      'Normatividad y cumplimiento',
      'Otras especialidades'
    ]
  },
  {
    id: 'Capacitacion_gestion_desarrollo_del_talento',
    name: 'Capacitación Gestión & Desarrollo del Talento',
    shortName: 'Gestión del Talento',
    subprograms: [
      'Formación y aprendizaje',
      'Habilidades estratégicas y tácticas',
      'Liderazgo'
    ]
  },
  {
    id: 'Capacitacion_desarrollo_humano',
    name: 'Capacitación en Desarrollo Humano',
    shortName: 'Desarrollo Humano',
    subprograms: [
      'ASUME',
      'Bienestar social'
    ]
  },
  {
    id: 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad',
    name: 'Capacitación en Seguridad, Salud en el Trabajo & Sustentabilidad',
    shortName: 'SST & Sustentabilidad',
    subprograms: [
      'Normas oficiales en materia de seguridad e higiene',
      'Prevención de riesgos institucionales',
      'Protección civil',
      'Seguridad e higiene',
      'Sustentabilidad'
    ]
  }
];

export const SESSION_TYPES = [
  'Asincrónica',
  'Sincrónica',
  'Híbrido'
] as const;

export type SessionType = typeof SESSION_TYPES[number];

export const TRAINING_TYPES = [
  'Conductual',
  'Técnico'
] as const;

export type TrainingType = typeof TRAINING_TYPES[number];

export const TRAINING_FORMATS = [
  'Taller',
  'Webinar',
  'Curso',
  'Cinefórum',
  'Charla',
  'Workshop',
  'Diplomado',
  'Certificación',
  'Seminario'
] as const;

export type TrainingFormat = typeof TRAINING_FORMATS[number];

export const EVENT_MODALITIES = [
  'Virtual',
  'Presencial',
  'Mixta'
] as const;

export const DEFAULT_SUPPLIER_OPTIONS = [
  'Claro',
  'INFOTEP',
  'Microsoft',
  'Cisco',
  'Google',
  'Oracle',
  'AWS',
  'Consultor Externo'
];

/**
 * Obtiene el nombre legible de un programa dado su identificador
 */
export function getProgramLabel(programId?: string): string {
  if (!programId) return 'Sin Programa Asignado';
  const found = SUSTAINABILITY_PROGRAMS.find(p => p.id === programId);
  return found ? found.name : programId.replace(/_/g, ' ');
}

/**
 * Obtiene el nombre corto de un programa
 */
export function getProgramShortName(programId?: string): string {
  if (!programId) return 'General';
  const found = SUSTAINABILITY_PROGRAMS.find(p => p.id === programId);
  return found ? found.shortName : programId.replace(/_/g, ' ');
}

/**
 * Retorna la lista de subprogramas válidos para un programa determinado
 */
export function getSubprogramsForProgram(programId?: string): string[] {
  if (!programId) return [];
  const found = SUSTAINABILITY_PROGRAMS.find(p => p.id === programId);
  return found ? found.subprograms : [];
}

/**
 * Indica si el evento está directamente enfocado en Sustentabilidad
 */
export function isSustainabilityProgram(programCategory?: string, subprogram?: string): boolean {
  if (subprogram?.toLowerCase().includes('sustentabilidad')) return true;
  if (programCategory === 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad') return true;
  return false;
}
