export interface SurveyQuestion {
  id: string;
  question: string;
  shortLabel: string;
  category: 'course' | 'facilitator';
}

export const TEC_RATING_SCALE = [
  { value: 1, label: 'No aceptable', shortLabel: 'No aceptable', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-300' },
  { value: 2, label: 'Necesita mejorar', shortLabel: 'Mejorable', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-300' },
  { value: 3, label: 'Satisfactorio', shortLabel: 'Satisfactorio', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-300' },
  { value: 4, label: 'Bueno', shortLabel: 'Bueno', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-300' },
  { value: 5, label: 'Excelente', shortLabel: 'Excelente', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-300' }
] as const;

export const TEC_SURVEY_INFO = {
  title: 'Evaluación de Curso y Facilitador - TEC',
  intro: 'Tu opinión es importante para nosotros. Esta es una evaluación del curso y del facilitador, que nos permite conocer los puntos fuertes y las oportunidades de mejora en nuestros entrenamientos.',
  disclaimer: 'La evaluación está dividida en dos, primero una evaluación para el curso y por último una evaluación al facilitador.',
  formUrl: 'https://forms.cloud.microsoft/r/dECVf7sDM7'
};

export const COURSE_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'c1',
    question: 'Al principio entendí lo que se esperaba que yo aprendiera',
    shortLabel: 'Claridad de objetivos iniciales',
    category: 'course'
  },
  {
    id: 'c2',
    question: 'El contenido y las actividades del entrenamiento coincidieron con lo que debía aprender',
    shortLabel: 'Alineación de contenidos',
    category: 'course'
  },
  {
    id: 'c3',
    question: 'Los métodos y actividades usados para desarrollar el entrenamiento (charlas, discusiones, ejercicios) fueron',
    shortLabel: 'Metodología y dinámicas',
    category: 'course'
  },
  {
    id: 'c4',
    question: 'La calidad de los manuales y/o presentación, redacción, ortografía) me parece',
    shortLabel: 'Material y presentación',
    category: 'course'
  },
  {
    id: 'c5',
    question: 'La aplicación de recursos audiovisuales, me parece',
    shortLabel: 'Recursos audiovisuales',
    category: 'course'
  },
  {
    id: 'c6',
    question: 'La duración del entrenamiento, me parece',
    shortLabel: 'Duración adecuada',
    category: 'course'
  },
  {
    id: 'c7',
    question: 'El grado confianza para ejecutar actividades en mi trabajo después del entrenamiento',
    shortLabel: 'Confianza de aplicación laboral',
    category: 'course'
  },
  {
    id: 'c8',
    question: 'En general califico el entrenamiento',
    shortLabel: 'Calificación global del curso',
    category: 'course'
  }
];

export const FACILITATOR_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'f1',
    question: 'Se explicó claramente lo que se esperaba que yo aprendiera',
    shortLabel: 'Claridad en explicaciones',
    category: 'facilitator'
  },
  {
    id: 'f2',
    question: 'Motivó la intervención de los participantes',
    shortLabel: 'Motivación y participación',
    category: 'facilitator'
  },
  {
    id: 'f3',
    question: 'Manejó preguntas y respuestas',
    shortLabel: 'Manejo de Q&A',
    category: 'facilitator'
  },
  {
    id: 'f4',
    question: 'Usó ejemplos para ilustrar tópicos',
    shortLabel: 'Ejemplos prácticos',
    category: 'facilitator'
  },
  {
    id: 'f5',
    question: 'Mantuvo el tema y el desarrollo del curso',
    shortLabel: 'Enfoque y orden temático',
    category: 'facilitator'
  },
  {
    id: 'f6',
    question: 'Demostró conocimiento de la asignatura',
    shortLabel: 'Dominio del tema',
    category: 'facilitator'
  },
  {
    id: 'f7',
    question: 'En general califico al Instructor',
    shortLabel: 'Calificación global del facilitador',
    category: 'facilitator'
  }
];

/**
 * Calcula los promedios de curso, facilitador y compuesto general
 */
export function calculateTecScores(
  courseRatings: Record<string, number>,
  facilitatorRatings: Record<string, number>
): { courseScore: number; facilitatorScore: number; compositeRating: number } {
  const cValues = Object.values(courseRatings).filter(v => typeof v === 'number' && v > 0);
  const fValues = Object.values(facilitatorRatings).filter(v => typeof v === 'number' && v > 0);

  const courseScore = cValues.length > 0 
    ? Number((cValues.reduce((a, b) => a + b, 0) / cValues.length).toFixed(2))
    : 5.0;

  const facilitatorScore = fValues.length > 0
    ? Number((fValues.reduce((a, b) => a + b, 0) / fValues.length).toFixed(2))
    : 5.0;

  const allValues = [...cValues, ...fValues];
  const compositeRating = allValues.length > 0
    ? Number((allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(2))
    : Number(((courseScore + facilitatorScore) / 2).toFixed(2));

  return {
    courseScore,
    facilitatorScore,
    compositeRating
  };
}
