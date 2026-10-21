export interface SurveyQuestion {
  id: string;
  question: string;
  shortLabel: string;
  category: 'course' | 'facilitator' | 'applicability';
}

export const TEC_RATING_SCALE = [
  { value: 1, label: 'No aceptable', shortLabel: 'No aceptable', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-300' },
  { value: 2, label: 'Necesita mejorar', shortLabel: 'Mejorable', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-300' },
  { value: 3, label: 'Satisfactorio', shortLabel: 'Satisfactorio', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-300' },
  { value: 4, label: 'Bueno', shortLabel: 'Bueno', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-300' },
  { value: 5, label: 'Excelente', shortLabel: 'Excelente', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-300' }
] as const;

export const NPS_SCALE = [
  { value: 0, label: 'Nada probable', category: 'detractor', color: 'bg-rose-500 hover:bg-rose-600 text-white' },
  { value: 1, label: 'Muy improbable', category: 'detractor', color: 'bg-rose-500 hover:bg-rose-600 text-white' },
  { value: 2, label: 'Improbable', category: 'detractor', color: 'bg-rose-500 hover:bg-rose-600 text-white' },
  { value: 3, label: 'Poco probable', category: 'detractor', color: 'bg-rose-500 hover:bg-rose-600 text-white' },
  { value: 4, label: 'Dudoso', category: 'detractor', color: 'bg-rose-500 hover:bg-rose-600 text-white' },
  { value: 5, label: 'Neutral bajo', category: 'detractor', color: 'bg-orange-500 hover:bg-orange-600 text-white' },
  { value: 6, label: 'Apenas probable', category: 'detractor', color: 'bg-orange-500 hover:bg-orange-600 text-white' },
  { value: 7, label: 'Probable', category: 'passive', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
  { value: 8, label: 'Muy probable', category: 'passive', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
  { value: 9, label: 'Altamente probable', category: 'promoter', color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  { value: 10, label: 'Totalmente seguro', category: 'promoter', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' }
] as const;

export const TEC_SURVEY_INFO = {
  title: 'Evaluación de Calidad y Reacción Kirkpatrick N1 & NPS',
  intro: 'Tu opinión es indispensable para el aseguramiento de la calidad académica en Claro Dominicana. Completar esta evaluación desbloquea de inmediato tu Diploma Oficial con código QR.',
  disclaimer: 'La encuesta evalúa el contenido y recursos del curso, el desempeño del facilitador, la aplicabilidad en tu puesto de trabajo y tu nivel de recomendación (NPS). Toma menos de 1 minuto.',
  formUrl: 'https://forms.cloud.microsoft/r/dECVf7sDM7'
};

export const COURSE_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'c1',
    question: 'Al principio entendí claramente lo que se esperaba que yo aprendiera (objetivos formativos)',
    shortLabel: 'Claridad de objetivos',
    category: 'course'
  },
  {
    id: 'c2',
    question: 'El contenido y las actividades del entrenamiento coincidieron con mis necesidades de aprendizaje',
    shortLabel: 'Alineación de contenidos',
    category: 'course'
  },
  {
    id: 'c3',
    question: 'Los métodos y actividades usados (ejercicios, prácticas, debates) mantuvieron mi interés',
    shortLabel: 'Metodología y dinámicas',
    category: 'course'
  },
  {
    id: 'c4',
    question: 'La calidad del material didáctico, guías técnicas y presentaciones audiovisuales fue',
    shortLabel: 'Material didáctico y soporte',
    category: 'course'
  },
  {
    id: 'c5',
    question: 'La duración del entrenamiento y la distribución del tiempo fueron adecuadas',
    shortLabel: 'Duración y ritmo del curso',
    category: 'course'
  },
  {
    id: 'c6',
    question: 'En general, ¿cómo calificas la calidad integral de este entrenamiento?',
    shortLabel: 'Calificación global del curso',
    category: 'course'
  }
];

export const FACILITATOR_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'f1',
    question: 'Explicó los temas de manera clara, estructurada y fácil de comprender',
    shortLabel: 'Claridad expositiva',
    category: 'facilitator'
  },
  {
    id: 'f2',
    question: 'Fomentó la participación activa, resolviendo dudas con dominio y profesionalismo',
    shortLabel: 'Resolución de dudas y Q&A',
    category: 'facilitator'
  },
  {
    id: 'f3',
    question: 'Utilizó ejemplos prácticos y situaciones reales aplicables a las operaciones',
    shortLabel: 'Ejemplos y casos prácticos',
    category: 'facilitator'
  },
  {
    id: 'f4',
    question: 'Demostró amplio dominio técnico y conocimiento de la materia impartida',
    shortLabel: 'Dominio técnico del instructor',
    category: 'facilitator'
  },
  {
    id: 'f5',
    question: 'En general, ¿cómo calificas el desempeño del instructor / facilitador?',
    shortLabel: 'Calificación global del facilitador',
    category: 'facilitator'
  }
];

export const APPLICABILITY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'a1',
    question: '¿Qué tan aplicables son los conocimientos y habilidades adquiridos a tus labores diarias en el trabajo?',
    shortLabel: 'Utilidad directa en el puesto',
    category: 'applicability'
  },
  {
    id: 'a2',
    question: '¿Qué nivel de confianza sientes para ejecutar estas tareas en tu trabajo tras completar el curso?',
    shortLabel: 'Confianza operativa post-curso',
    category: 'applicability'
  }
];

/**
 * Calcula los promedios de curso, facilitador, aplicabilidad y compuesto general
 */
export function calculateTecScores(
  courseRatings: Record<string, number>,
  facilitatorRatings: Record<string, number>,
  applicabilityRatings?: Record<string, number>
): { 
  courseScore: number; 
  facilitatorScore: number; 
  applicabilityScore: number;
  compositeRating: number;
} {
  const cValues = Object.values(courseRatings).filter(v => typeof v === 'number' && v > 0);
  const fValues = Object.values(facilitatorRatings).filter(v => typeof v === 'number' && v > 0);
  const aValues = applicabilityRatings 
    ? Object.values(applicabilityRatings).filter(v => typeof v === 'number' && v > 0)
    : [];

  const courseScore = cValues.length > 0 
    ? Number((cValues.reduce((a, b) => a + b, 0) / cValues.length).toFixed(2))
    : 5.0;

  const facilitatorScore = fValues.length > 0
    ? Number((fValues.reduce((a, b) => a + b, 0) / fValues.length).toFixed(2))
    : 5.0;

  const applicabilityScore = aValues.length > 0
    ? Number((aValues.reduce((a, b) => a + b, 0) / aValues.length).toFixed(2))
    : 5.0;

  const allValues = [...cValues, ...fValues, ...aValues];
  const compositeRating = allValues.length > 0
    ? Number((allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(2))
    : Number(((courseScore + facilitatorScore) / 2).toFixed(2));

  return {
    courseScore,
    facilitatorScore,
    applicabilityScore,
    compositeRating
  };
}
