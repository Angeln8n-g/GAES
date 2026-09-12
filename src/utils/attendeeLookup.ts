import { TrainingEvent, Schedule, Slot, Participant, UserAccount } from '../types';
import { formatCedula } from './formatters';

export interface ScheduledSessionItem {
  event: TrainingEvent;
  schedule: Schedule;
  slot: Slot;
  hasAttended: boolean;
  isMandatory: boolean;
  isToday: boolean;
  isPast: boolean;
  assignedBy?: string | null;
  assignmentNotes?: string | null;
}

export interface AttendeeLookupResult {
  found: boolean;
  matchedBy: 'cedula' | 'card' | 'email' | 'none';
  participant?: Participant;
  user?: UserAccount;
  displayName: string;
  displayCedula?: string;
  displayCard?: string;
  displayDepartment?: string;
  displayEmail?: string;
  displaySupervisor?: string;
  sessions: ScheduledSessionItem[];
}

/**
 * Busca un colaborador por cédula, número de tarjeta o correo,
 * y extrae todos los eventos y cursos en los que está agendado.
 */
export function findAttendeeByCedula(
  query: string,
  participants: Participant[],
  users: UserAccount[],
  events: TrainingEvent[]
): AttendeeLookupResult {
  if (!query || !query.trim()) {
    return {
      found: false,
      matchedBy: 'none',
      displayName: '',
      sessions: []
    };
  }

  const raw = query.trim();
  const digits = raw.replace(/\D/g, '');
  const lowerQuery = raw.toLowerCase();

  let matchedParticipant: Participant | undefined;
  let matchedUser: UserAccount | undefined;
  let matchedBy: 'cedula' | 'card' | 'email' | 'none' = 'none';

  // 1. Intento por Cédula (11 dígitos o coincidencia limpia)
  if (digits.length >= 7) {
    matchedParticipant = participants.find(p => {
      if (!p.cedula) return false;
      const pDigits = p.cedula.replace(/\D/g, '');
      return pDigits === digits || p.cedula.trim() === raw;
    });

    if (!matchedParticipant) {
      matchedUser = users.find(u => {
        if (!u.cedula) return false;
        const uDigits = u.cedula.replace(/\D/g, '');
        return uDigits === digits || u.cedula.trim() === raw;
      });
    }

    if (matchedParticipant || matchedUser) {
      matchedBy = 'cedula';
    }
  }

  // 2. Intento por Tarjeta / Código de Empleado (si no hizo match por cédula)
  if (!matchedParticipant && !matchedUser) {
    matchedParticipant = participants.find(p => p.card.toLowerCase() === lowerQuery);
    if (matchedParticipant) {
      matchedBy = 'card';
    }
  }

  // 3. Intento por Correo Electrónico
  if (!matchedParticipant && !matchedUser) {
    matchedParticipant = participants.find(p => p.email.toLowerCase() === lowerQuery);
    matchedUser = users.find(u => u.email.toLowerCase() === lowerQuery);
    if (matchedParticipant || matchedUser) {
      matchedBy = 'email';
    }
  }

  // Si no se encontró ningún registro
  if (!matchedParticipant && !matchedUser) {
    return {
      found: false,
      matchedBy: 'none',
      displayName: '',
      displayCedula: digits.length === 11 ? formatCedula(digits) : raw,
      sessions: []
    };
  }

  // Si encontramos usuario o participante, cruzamos datos
  if (matchedParticipant && !matchedUser) {
    const email = matchedParticipant.email.toLowerCase();
    matchedUser = users.find(u => u.email.toLowerCase() === email);
  } else if (matchedUser && !matchedParticipant) {
    const email = matchedUser.email.toLowerCase();
    matchedParticipant = participants.find(p => p.email.toLowerCase() === email);
  }

  const emailsToMatch = new Set<string>();
  if (matchedParticipant?.email) emailsToMatch.add(matchedParticipant.email.toLowerCase());
  if (matchedUser?.email) emailsToMatch.add(matchedUser.email.toLowerCase());

  // Fecha actual en formato YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // Extraer todas las sesiones en las que está agendado
  const sessions: ScheduledSessionItem[] = [];

  events.forEach(evt => {
    (evt.schedule || []).forEach(sch => {
      const isToday = sch.date === todayStr;
      const isPast = sch.date < todayStr;

      (sch.slots || []).forEach(slot => {
        const attendeeEmails = (slot.attendees || []).map(a => a.toLowerCase());
        const isEnrolled = Array.from(emailsToMatch).some(e => attendeeEmails.includes(e));

        if (isEnrolled) {
          const attendedEmails = (slot.attendedList || []).map(a => a.toLowerCase());
          const hasAttended = Array.from(emailsToMatch).some(e => attendedEmails.includes(e));

          const detail = (slot.attendeesDetails || []).find(d => 
            Array.from(emailsToMatch).includes(d.email.toLowerCase())
          );

          sessions.push({
            event: evt,
            schedule: sch,
            slot: slot,
            hasAttended,
            isMandatory: Boolean(detail?.isMandatory),
            isToday,
            isPast,
            assignedBy: detail?.assignedBy || null,
            assignmentNotes: detail?.assignmentNotes || null
          });
        }
      });
    });
  });

  // Ordenar sesiones:
  // 1. Sesiones de HOY primero
  // 2. Sesiones futuras ordenadas por fecha más cercana
  // 3. Sesiones pasadas al final
  sessions.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    if (!a.isPast && b.isPast) return -1;
    if (a.isPast && !b.isPast) return 1;
    return a.schedule.date.localeCompare(b.schedule.date);
  });

  const rawCedula = matchedParticipant?.cedula || matchedUser?.cedula;
  const formattedCedula = rawCedula ? formatCedula(rawCedula) : undefined;

  return {
    found: true,
    matchedBy,
    participant: matchedParticipant,
    user: matchedUser,
    displayName: matchedParticipant?.name || matchedUser?.name || 'Colaborador Claro',
    displayCedula: formattedCedula,
    displayCard: matchedParticipant?.card,
    displayDepartment: matchedParticipant?.department || matchedUser?.department,
    displayEmail: matchedParticipant?.email || matchedUser?.email,
    displaySupervisor: matchedParticipant?.supervisorName,
    sessions
  };
}
