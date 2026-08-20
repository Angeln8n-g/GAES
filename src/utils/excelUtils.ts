import * as XLSX from 'xlsx';
import { 
  TrainingEvent, 
  Participant, 
  UserAccount, 
  UserRole, 
  ParticipantGroup, 
  TrainingProgram, 
  ProgramComplianceSummary 
} from '../types';
import { formatDateLong, formatCedula, isValidCedula } from './formatters';

/**
 * Exporta la lista de asistentes de un horario/evento a un archivo Excel (.xlsx)
 */
export const exportAttendeesToExcel = (
  event: TrainingEvent,
  dateStr: string,
  timeStr: string,
  attendeeEmails: string[],
  attendedList: string[] = [],
  allParticipants: Participant[] = []
): void => {
  const data = attendeeEmails.map((email, idx) => {
    const participant = allParticipants.find(p => p.email.toLowerCase() === email.toLowerCase());
    const hasAttended = attendedList.includes(email);
    
    return {
      'No.': idx + 1,
      'Cédula': participant?.cedula || 'N/A',
      'No. Tarjeta': participant?.card || 'N/A',
      'Nombre del Colaborador': participant?.name || 'Usuario no registrado',
      'Correo Electrónico': email,
      'Evento': event.title,
      'Fecha': dateStr,
      'Horario': timeStr,
      'Modalidad': event.modality,
      'Instructor': event.instructor,
      'Asistencia Confirmada': hasAttended ? 'SÍ (Confirmado)' : 'NO (Pendiente)'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistentes');

  // Ajustar anchos de columna
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 18 }, // Cédula
    { wch: 15 }, // Tarjeta
    { wch: 30 }, // Nombre
    { wch: 30 }, // Correo
    { wch: 30 }, // Evento
    { wch: 12 }, // Fecha
    { wch: 12 }, // Horario
    { wch: 12 }, // Modalidad
    { wch: 25 }, // Instructor
    { wch: 20 }  // Asistencia
  ];

  const fileName = `Asistencia_${event.title.slice(0, 20).replace(/\s+/g, '_')}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Exporta el padrón completo de participantes a Excel
 */
export const exportParticipantsToExcel = (participants: Participant[]): void => {
  const data = participants.map((p, idx) => ({
    'No.': idx + 1,
    'Cédula': p.cedula || '',
    'No. Tarjeta': p.card,
    'Nombre Completo': p.name,
    'Correo Corporativo': p.email,
    'Departamento': p.department || 'General',
    'Supervisor Asignado': p.supervisorName || 'Sin asignar'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');
  ws['!cols'] = [
    { wch: 6 }, 
    { wch: 18 }, 
    { wch: 16 }, 
    { wch: 35 }, 
    { wch: 35 }, 
    { wch: 22 }, 
    { wch: 30 }
  ];
  XLSX.writeFile(wb, 'Padron_Colaboradores_CapacitaHub.xlsx');
};

/**
 * Exporta el listado completo de usuarios y cuentas del sistema a Excel
 */
export const exportUsersToExcel = (users: UserAccount[]): void => {
  const data = users.map((u, idx) => ({
    'No.': idx + 1,
    'Cédula': u.cedula || 'N/A',
    'Nombre Completo': u.name,
    'Correo Corporativo': u.email,
    'Rol en Sistema': u.role
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
  ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 35 }, { wch: 35 }, { wch: 25 }];
  XLSX.writeFile(wb, 'Usuarios_CapacitaHub.xlsx');
};

/**
 * Genera y descarga la Plantilla Oficial de Excel para creación masiva de usuarios
 */
export const downloadUsersTemplateExcel = (): void => {
  const sampleData = [
    {
      'Cédula (000-0000000-0)': '402-2196163-1',
      'Nombre Completo': 'Ana Morales Batista',
      'Correo Electrónico': 'ana.morales@empresa.com',
      'Rol (Colaborador / Editor / Super Admin)': 'Colaborador (User)',
      'Contraseña Inicial (Opcional)': '123'
    },
    {
      'Cédula (000-0000000-0)': '001-0876543-2',
      'Nombre Completo': 'Carlos Gómez Herrera',
      'Correo Electrónico': 'carlos.gomez@empresa.com',
      'Rol (Colaborador / Editor / Super Admin)': 'Administrador / Editor',
      'Contraseña Inicial (Opcional)': 'admin2026'
    },
    {
      'Cédula (000-0000000-0)': '031-0456789-4',
      'Nombre Completo': 'Laura Patricia Sánchez',
      'Correo Electrónico': 'laura.sanchez@empresa.com',
      'Rol (Colaborador / Editor / Super Admin)': 'Colaborador (User)',
      'Contraseña Inicial (Opcional)': '123'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Usuarios');

  ws['!cols'] = [
    { wch: 24 }, // Cédula
    { wch: 30 }, // Nombre
    { wch: 32 }, // Correo
    { wch: 40 }, // Rol
    { wch: 28 }  // Contraseña
  ];

  XLSX.writeFile(wb, 'Plantilla_Carga_Masiva_Usuarios_CapacitaHub.xlsx');
};

/**
 * Exporta el reporte ejecutivo de métricas del Dashboard
 */
export const exportDashboardReportToExcel = (
  events: TrainingEvent[],
  participants: Participant[]
): void => {
  // Hoja 1: Resumen de eventos
  const eventsData = events.map(evt => {
    let totalCap = 0;
    let totalReg = 0;
    let totalAtt = 0;
    
    evt.schedule.forEach(sch => {
      sch.slots.forEach(slot => {
        totalCap += slot.capacity;
        totalReg += slot.registered;
        totalAtt += (slot.attendedList || []).length;
      });
    });

    const occupancyRate = totalCap > 0 ? Math.round((totalReg / totalCap) * 100) : 0;
    const attendanceRate = totalReg > 0 ? Math.round((totalAtt / totalReg) * 100) : 0;

    return {
      'ID': evt.id,
      'Título': evt.title,
      'Categoría': evt.category,
      'Modalidad': evt.modality,
      'Instructor': evt.instructor,
      'Capacidad Total': totalCap,
      'Total Inscritos': totalReg,
      'Total Asistieron': totalAtt,
      'Tasa de Ocupación': `${occupancyRate}%`,
      'Tasa de Asistencia': `${attendanceRate}%`,
      'Estado': evt.status === 'active' ? 'Activo' : 'Inactivo'
    };
  });

  const wb = XLSX.utils.book_new();
  const wsEvents = XLSX.utils.json_to_sheet(eventsData);
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Resumen Capacitaciones');

  XLSX.writeFile(wb, 'Reporte_Metricas_CapacitaHub.xlsx');
};

/**
 * Normaliza y mapea cadenas de rol al tipo de rol UserRole
 */
export const normalizeUserRole = (rawRole: string): UserRole => {
  const r = (rawRole || '').toLowerCase().trim();
  if (r.includes('super')) return 'Super Administrador';
  if (r.includes('admin') || r.includes('editor')) return 'Administrador / Editor';
  return 'Colaborador (User)';
};

/**
 * Procesa un archivo Excel/CSV subido por el usuario para extraer participantes
 */
export const parseParticipantsExcelFile = async (file: File): Promise<Participant[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) {
          throw new Error('El archivo está vacío o no contiene filas de datos.');
        }

        // Detectar columnas
        const header = rows[0].map((h: any) => String(h || '').toLowerCase().trim());
        let cedulaIdx = header.findIndex((h: string) => h.includes('cedula') || h.includes('cédula'));
        let cardIdx = header.findIndex((h: string) => h.includes('tarjeta') || h.includes('card') || h.includes('carnet') || h.includes('codigo') || h.includes('código'));
        let nameIdx = header.findIndex((h: string) => h.includes('nombre') || h.includes('name') || h.includes('colaborador') || h.includes('participante'));
        let emailIdx = header.findIndex((h: string) => h.includes('correo') || h.includes('email') || h.includes('mail'));
        let deptIdx = header.findIndex((h: string) => h.includes('departamento') || h.includes('area') || h.includes('área') || h.includes('dept'));
        let superIdx = header.findIndex((h: string) => h.includes('supervisor') || h.includes('lider') || h.includes('líder') || h.includes('jefe'));

        // Fallbacks si no tienen encabezados exactos
        if (cardIdx === -1 && cedulaIdx === -1) cardIdx = 0;
        if (nameIdx === -1) nameIdx = 1;
        if (emailIdx === -1) emailIdx = 2;

        const participants: Participant[] = [];
        const seenCards = new Set<string>();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          let rawCedula = cedulaIdx !== -1 ? String(row[cedulaIdx] || '').trim() : '';
          let cedula = rawCedula ? formatCedula(rawCedula) : undefined;
          let card = cardIdx !== -1 ? String(row[cardIdx] || '').trim() : (cedula || `${1000 + i}`);
          const name = String(row[nameIdx] || '').trim();
          const email = String(row[emailIdx] || '').trim();
          const department = deptIdx !== -1 ? String(row[deptIdx] || '').trim() : undefined;
          const supervisorName = superIdx !== -1 ? String(row[superIdx] || '').trim() : undefined;

          if (card && name && !seenCards.has(card)) {
            seenCards.add(card);
            participants.push({ 
              card, 
              name, 
              email, 
              cedula, 
              department: department || undefined, 
              supervisorName: supervisorName || undefined 
            });
          }
        }

        resolve(participants);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export interface ParsedUserResult {
  validUsers: UserAccount[];
  invalidRows: Array<{ row: number; data: any; reason: string }>;
}

/**
 * Procesa un archivo Excel/CSV subido para extraer e instanciar cuentas de usuario
 */
export const parseUsersExcelFile = async (file: File): Promise<ParsedUserResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) {
          throw new Error('El archivo está vacío o no contiene filas de datos.');
        }

        // Detectar columnas
        const header = rows[0].map((h: any) => String(h || '').toLowerCase().trim());
        let cedulaIdx = header.findIndex((h: string) => h.includes('cedula') || h.includes('cédula'));
        let nameIdx = header.findIndex((h: string) => h.includes('nombre') || h.includes('name') || h.includes('usuario'));
        let emailIdx = header.findIndex((h: string) => h.includes('correo') || h.includes('email') || h.includes('mail'));
        let roleIdx = header.findIndex((h: string) => h.includes('rol') || h.includes('role') || h.includes('perfil') || h.includes('tipo'));
        let passIdx = header.findIndex((h: string) => h.includes('contrase') || h.includes('password') || h.includes('clave') || h.includes('pass'));

        if (nameIdx === -1) nameIdx = cedulaIdx === 0 ? 1 : 0;
        if (emailIdx === -1) emailIdx = nameIdx === 1 ? 2 : 1;

        const validUsers: UserAccount[] = [];
        const invalidRows: Array<{ row: number; data: any; reason: string }> = [];
        const seenEmails = new Set<string>();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawCedula = cedulaIdx !== -1 ? String(row[cedulaIdx] || '').trim() : '';
          const name = String(row[nameIdx] || '').trim();
          const email = String(row[emailIdx] || '').trim().toLowerCase();
          const rawRole = roleIdx !== -1 ? String(row[roleIdx] || '').trim() : '';
          const password = passIdx !== -1 && row[passIdx] ? String(row[passIdx]).trim() : '123';

          if (!name) {
            invalidRows.push({ row: i + 1, data: row, reason: 'El nombre completo es obligatorio.' });
            continue;
          }

          if (!email || !email.includes('@')) {
            invalidRows.push({ row: i + 1, data: row, reason: 'Correo electrónico inválido o ausente.' });
            continue;
          }

          if (seenEmails.has(email)) {
            invalidRows.push({ row: i + 1, data: row, reason: `Correo duplicado en el mismo archivo: ${email}` });
            continue;
          }

          // Validación de Cédula (si viene provista, debe tener formato de 11 dígitos 000-0000000-0)
          let formattedCedula: string | undefined = undefined;
          if (rawCedula) {
            formattedCedula = formatCedula(rawCedula);
            if (!isValidCedula(formattedCedula)) {
              invalidRows.push({ 
                row: i + 1, 
                data: row, 
                reason: `Cédula inválida "${rawCedula}". Debe tener 11 dígitos en formato 000-0000000-0 (ej. 402-2196163-1).` 
              });
              continue;
            }
          }

          seenEmails.add(email);
          validUsers.push({
            id: `usr_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
            name,
            email,
            role: normalizeUserRole(rawRole),
            password: password || '123',
            cedula: formattedCedula
          });
        }

        resolve({ validUsers, invalidRows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parsea texto multilínea pegado desde el portapapeles o Excel
 * Formato esperado: Cédula (opcional), Nombre, Correo, Rol (opcional), Contraseña (opcional)
 * Separado por tabulación (\t), coma (,) o punto y coma (;)
 */
export const parseUsersFromText = (text: string): { validUsers: UserAccount[]; invalidRows: Array<{ line: number; text: string; reason: string }> } => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const validUsers: UserAccount[] = [];
  const invalidRows: Array<{ line: number; text: string; reason: string }> = [];
  const seenEmails = new Set<string>();

  lines.forEach((line, idx) => {
    // Si es la cabecera (contiene "nombre" o "correo" o "cedula"), omitir
    const lower = line.toLowerCase();
    if (idx === 0 && (lower.includes('correo') || lower.includes('email') || lower.includes('nombre') || lower.includes('cédula') || lower.includes('cedula'))) {
      return;
    }

    // Dividir por tabulación o comas o punto y coma
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(';')) {
      parts = line.split(';');
    } else {
      parts = line.split(',');
    }
    parts = parts.map(p => p.trim());

    if (parts.length < 2) {
      invalidRows.push({ line: idx + 1, text: line, reason: 'Fila con columnas insuficientes. Se requiere al menos Nombre y Correo.' });
      return;
    }

    // Determinar si la primera columna es cédula (contiene números o guiones)
    let cedulaVal = '';
    let nameVal = '';
    let emailVal = '';
    let roleVal = '';
    let passVal = '123';

    if (parts[0].includes('@')) {
      // Formato: Correo, Nombre, ...
      emailVal = parts[0];
      nameVal = parts[1] || '';
      roleVal = parts[2] || '';
      passVal = parts[3] || '123';
    } else if (/^\d{3}/.test(parts[0]) || /^\d{11}$/.test(parts[0].replace(/\D/g, ''))) {
      // Formato: Cédula, Nombre, Correo, Rol, Contraseña
      cedulaVal = parts[0];
      nameVal = parts[1] || '';
      emailVal = parts[2] || '';
      roleVal = parts[3] || '';
      passVal = parts[4] || '123';
    } else {
      // Formato: Nombre, Correo, Rol, Contraseña
      nameVal = parts[0];
      emailVal = parts[1] || '';
      roleVal = parts[2] || '';
      passVal = parts[3] || '123';
    }

    if (!nameVal) {
      invalidRows.push({ line: idx + 1, text: line, reason: 'El nombre completo es obligatorio.' });
      return;
    }

    if (!emailVal || !emailVal.includes('@')) {
      invalidRows.push({ line: idx + 1, text: line, reason: 'Correo electrónico inválido.' });
      return;
    }

    const cleanEmail = emailVal.toLowerCase();
    if (seenEmails.has(cleanEmail)) {
      invalidRows.push({ line: idx + 1, text: line, reason: `Correo duplicado en la entrada: ${cleanEmail}` });
      return;
    }

    let formattedCedula: string | undefined = undefined;
    if (cedulaVal) {
      formattedCedula = formatCedula(cedulaVal);
      if (!isValidCedula(formattedCedula)) {
        invalidRows.push({ 
          line: idx + 1, 
          text: line, 
          reason: `Cédula inválida "${cedulaVal}". Debe tener 11 dígitos en formato 000-0000000-0 (ej. 402-2196163-1).` 
        });
        return;
      }
    }

    seenEmails.add(cleanEmail);
    validUsers.push({
      id: `usr_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
      name: nameVal,
      email: cleanEmail,
      role: normalizeUserRole(roleVal),
      password: passVal || '123',
      cedula: formattedCedula
    });
  });

  return { validUsers, invalidRows };
};

/**
 * Exporta la matriz y reporte de cumplimiento de un programa a Excel
 */
export const exportComplianceReportToExcel = (
  complianceSummary: ProgramComplianceSummary,
  events: TrainingEvent[]
): void => {
  const eventsMap = new Map(events.map(e => [e.id, e.title]));

  // Hoja 1: Resumen General y por Participante
  const participantsData = complianceSummary.participants.map((p, idx) => {
    const row: Record<string, any> = {
      'No.': idx + 1,
      'Cédula': p.participantCedula || 'N/A',
      'No. Tarjeta': p.participantCard,
      'Nombre del Colaborador': p.participantName,
      'Correo Corporativo': p.participantEmail,
      'Grupos / Áreas': p.groupNames.join(', ') || 'Sin Grupo',
      '% Cumplimiento': `${p.percentage}%`,
      'Estatus': p.status === 'completed' ? 'CUMPLIDO' : p.status === 'overdue' ? 'ATRASADO' : p.status === 'in_progress' ? 'EN PROGRESO' : 'NO INICIADO',
      'Cursos Completados': `${p.completedEventsCount} de ${p.totalAssignedEvents}`,
      'Obligatorios Cumplidos': `${p.mandatoryCompletedCount} de ${p.mandatoryEventsCount}`
    };

    // Añadir columna por cada evento del programa
    p.eventsDetail.forEach(evt => {
      const eventTitle = eventsMap.get(evt.eventId) || evt.eventId;
      const key = `${eventTitle} (${evt.isMandatory ? 'Obligatorio' : 'Opcional'})`;
      row[key] = evt.status === 'attended' 
        ? `✅ Asistió (${evt.attendedDate || 'Sí'})` 
        : evt.status === 'registered' 
        ? `📅 Agendado (${evt.registeredDate || ''} ${evt.registeredTime || ''})` 
        : '❌ Pendiente';
    });

    return row;
  });

  // Hoja 2: Resumen por Grupos
  const groupsData = complianceSummary.groupStats.map((g, idx) => ({
    'No.': idx + 1,
    'Grupo / Área': g.groupName,
    'Total Colaboradores': g.totalMembers,
    'Colaboradores que Cumplieron': g.completedMembers,
    '% Cumplimiento Promedio': `${g.averagePercentage}%`
  }));

  const wb = XLSX.utils.book_new();

  const wsParticipants = XLSX.utils.json_to_sheet(participantsData);
  XLSX.utils.book_append_sheet(wb, wsParticipants, 'Cumplimiento Colaboradores');

  const wsGroups = XLSX.utils.json_to_sheet(groupsData);
  XLSX.utils.book_append_sheet(wb, wsGroups, 'Resumen por Grupos');

  const cleanTitle = complianceSummary.programTitle.slice(0, 25).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Cumplimiento_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Exporta el catálogo de grupos y sus integrantes a Excel
 */
export const exportGroupsToExcel = (
  groups: ParticipantGroup[],
  participants: Participant[]
): void => {
  const participantsMap = new Map(participants.map(p => [p.card, p]));

  const rows: any[] = [];
  groups.forEach(g => {
    if (g.memberCards.length === 0) {
      rows.push({
        'ID Grupo': g.id,
        'Nombre del Grupo': g.name,
        'Departamento': g.department || 'N/A',
        'No. Tarjeta': '',
        'Nombre Colaborador': '',
        'Correo': '',
        'Cédula': ''
      });
    } else {
      g.memberCards.forEach(card => {
        const p = participantsMap.get(card);
        rows.push({
          'ID Grupo': g.id,
          'Nombre del Grupo': g.name,
          'Departamento': g.department || 'N/A',
          'No. Tarjeta': card,
          'Nombre Colaborador': p?.name || 'No encontrado',
          'Correo': p?.email || '',
          'Cédula': p?.cedula || ''
        });
      });
    }
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Grupos e Integrantes');

  XLSX.writeFile(wb, `Grupos_Colaboradores_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Exporta el Reporte Ejecutivo Global Consolidado (Multicapa)
 */
export const exportFullExecutiveDashboardReportToExcel = (
  events: TrainingEvent[],
  participants: Participant[],
  groups: ParticipantGroup[],
  programs: TrainingProgram[]
): void => {
  let totalCap = 0;
  let totalReg = 0;
  let totalAtt = 0;
  let totalFeedbacks = 0;
  let totalRatingSum = 0;

  const categoryStats: Record<string, { count: number; capacity: number; registered: number; attended: number }> = {};
  const instructorStats: Record<string, { events: number; registered: number; attended: number; ratings: number[] }> = {};

  events.forEach(evt => {
    if (!categoryStats[evt.category]) {
      categoryStats[evt.category] = { count: 0, capacity: 0, registered: 0, attended: 0 };
    }
    categoryStats[evt.category].count += 1;

    if (!instructorStats[evt.instructor]) {
      instructorStats[evt.instructor] = { events: 0, registered: 0, attended: 0, ratings: [] };
    }
    instructorStats[evt.instructor].events += 1;

    (evt.feedbacks || []).forEach(fb => {
      totalFeedbacks++;
      totalRatingSum += fb.rating;
      instructorStats[evt.instructor].ratings.push(fb.rating);
    });

    evt.schedule.forEach(sch => {
      sch.slots.forEach(slot => {
        totalCap += slot.capacity;
        totalReg += slot.registered;
        const attCount = (slot.attendedList || []).length;
        totalAtt += attCount;

        categoryStats[evt.category].capacity += slot.capacity;
        categoryStats[evt.category].registered += slot.registered;
        categoryStats[evt.category].attended += attCount;

        instructorStats[evt.instructor].registered += slot.registered;
        instructorStats[evt.instructor].attended += attCount;
      });
    });
  });

  const occupancyRate = totalCap > 0 ? Math.round((totalReg / totalCap) * 100) : 0;
  const attendanceEffectiveness = totalReg > 0 ? Math.round((totalAtt / totalReg) * 100) : 0;
  const avgSatisfaction = totalFeedbacks > 0 ? (totalRatingSum / totalFeedbacks).toFixed(1) : 'N/A';
  const estimatedTrainingHours = totalAtt * 2; // Estimado promedio 2 horas por curso

  // Hoja 1: Resumen Ejecutivo
  const kpiData = [
    { 'Indicador / Métrica Clave': 'Total Oferta de Cupos', 'Valor': totalCap, 'Unidad / Detalle': 'Cupos disponibles' },
    { 'Indicador / Métrica Clave': 'Total Colaboradores Inscritos', 'Valor': totalReg, 'Unidad / Detalle': 'Reservas registradas' },
    { 'Indicador / Métrica Clave': 'Tasa de Ocupación Global', 'Valor': `${occupancyRate}%`, 'Unidad / Detalle': 'Inscritos / Capacidad' },
    { 'Indicador / Métrica Clave': 'Asistencias Confirmadas (QR)', 'Valor': totalAtt, 'Unidad / Detalle': 'Check-ins verificados' },
    { 'Indicador / Métrica Clave': 'Efectividad de Asistencia', 'Valor': `${attendanceEffectiveness}%`, 'Unidad / Detalle': 'Asistieron / Inscritos' },
    { 'Indicador / Métrica Clave': 'Horas-Hombre de Capacitación Estimadas', 'Valor': estimatedTrainingHours, 'Unidad / Detalle': 'Horas de formación impartidas' },
    { 'Indicador / Métrica Clave': 'Índice de Satisfacción (CSAT)', 'Valor': avgSatisfaction, 'Unidad / Detalle': 'Escala 1 a 5 estrellas' },
    { 'Indicador / Métrica Clave': 'Total Evaluaciones Recibidas', 'Valor': totalFeedbacks, 'Unidad / Detalle': 'Encuestas contestadas' },
    { 'Indicador / Métrica Clave': 'Padrón Total de Colaboradores', 'Valor': participants.length, 'Unidad / Detalle': 'Colaboradores registrados' },
    { 'Indicador / Métrica Clave': 'Grupos / Áreas Definidas', 'Valor': groups.length, 'Unidad / Detalle': 'Cohortes activas' },
    { 'Indicador / Métrica Clave': 'Cronogramas Formativos Activos', 'Valor': programs.filter(p => p.status === 'active').length, 'Unidad / Detalle': 'Rutas vigentes' }
  ];

  // Hoja 2: Detalle por Capacitación
  const eventsDetailData = events.map((evt, idx) => {
    let evtCap = 0;
    let evtReg = 0;
    let evtAtt = 0;
    evt.schedule.forEach(s => s.slots.forEach(sl => {
      evtCap += sl.capacity;
      evtReg += sl.registered;
      evtAtt += (sl.attendedList || []).length;
    }));

    return {
      'No.': idx + 1,
      'ID Evento': evt.id,
      'Título': evt.title,
      'Categoría': evt.category,
      'Modalidad': evt.modality,
      'Ubicación / Plataforma': evt.location,
      'Instructor': evt.instructor,
      'Fechas Disponibles': evt.schedule.length,
      'Capacidad Total': evtCap,
      'Inscritos': evtReg,
      'Asistieron': evtAtt,
      '% Ocupación': `${evtCap > 0 ? Math.round((evtReg / evtCap) * 100) : 0}%`,
      '% Asistencia': `${evtReg > 0 ? Math.round((evtAtt / evtReg) * 100) : 0}%`,
      'Calificación Promedio': evt.feedbacks && evt.feedbacks.length > 0
        ? (evt.feedbacks.reduce((a, b) => a + b.rating, 0) / evt.feedbacks.length).toFixed(1)
        : 'Sin evaluaciones'
    };
  });

  // Hoja 3: Categorías
  const categoriesData = Object.entries(categoryStats).map(([cat, stat], idx) => ({
    'No.': idx + 1,
    'Categoría': cat,
    'Cantidad de Cursos': stat.count,
    'Capacidad Total': stat.capacity,
    'Total Inscritos': stat.registered,
    'Total Asistieron': stat.attended,
    '% Ocupación': `${stat.capacity > 0 ? Math.round((stat.registered / stat.capacity) * 100) : 0}%`
  }));

  // Hoja 4: Instructores
  const instructorsData = Object.entries(instructorStats).map(([inst, stat], idx) => {
    const avg = stat.ratings.length > 0 ? (stat.ratings.reduce((a, b) => a + b, 0) / stat.ratings.length).toFixed(1) : 'N/A';
    return {
      'No.': idx + 1,
      'Facilitador / Instructor': inst,
      'Cursos Facilitados': stat.events,
      'Inscripciones Totales': stat.registered,
      'Asistentes Confirmados': stat.attended,
      '% Asistencia': `${stat.registered > 0 ? Math.round((stat.attended / stat.registered) * 100) : 0}%`,
      'Satisfacción Promedio': avg,
      'Total Encuestas': stat.ratings.length
    };
  });

  const wb = XLSX.utils.book_new();

  const wsKpi = XLSX.utils.json_to_sheet(kpiData);
  XLSX.utils.book_append_sheet(wb, wsKpi, 'Resumen Ejecutivo');
  wsKpi['!cols'] = [{ wch: 45 }, { wch: 15 }, { wch: 35 }];

  const wsEvents = XLSX.utils.json_to_sheet(eventsDetailData);
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Detalle Capacitaciones');

  const wsCat = XLSX.utils.json_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categorías');

  const wsInst = XLSX.utils.json_to_sheet(instructorsData);
  XLSX.utils.book_append_sheet(wb, wsInst, 'Desempeño Facilitadores');

  const fileName = `Informe_Ejecutivo_Capacitaciones_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Exporta el Libro Oficial de Asistencias & Auditoría de Capacitación
 */
export const exportAttendanceAuditReportToExcel = (
  events: TrainingEvent[],
  participants: Participant[]
): void => {
  const participantsMap = new Map(participants.map(p => [p.email.toLowerCase(), p]));

  const auditRows: any[] = [];
  let counter = 1;

  events.forEach(evt => {
    evt.schedule.forEach(sch => {
      sch.slots.forEach(slot => {
        const attendedSet = new Set((slot.attendedList || []).map(a => a.toLowerCase()));

        slot.attendees.forEach(email => {
          const cleanEmail = email.toLowerCase();
          const p = participantsMap.get(cleanEmail);
          const hasAttended = attendedSet.has(cleanEmail);

          auditRows.push({
            'No. Registro': counter++,
            'Cédula': p?.cedula || 'N/A',
            'No. Tarjeta': p?.card || 'N/A',
            'Nombre del Colaborador': p?.name || 'Usuario No Registrado',
            'Correo Corporativo': email,
            'Evento / Capacitación': evt.title,
            'Categoría': evt.category,
            'Modalidad': evt.modality,
            'Lugar / Enlace': evt.location,
            'Instructor': evt.instructor,
            'Fecha de Sesión': sch.date,
            'Horario': slot.time,
            'Asistencia Confirmada (QR)': hasAttended ? 'SÍ (Confirmada)' : 'NO (Ausente / No Registrado)',
            'Estatus de Cumplimiento': hasAttended ? 'APROBADO' : 'PENDIENTE / NO ASISTIÓ'
          });
        });
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(auditRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Auditoría de Asistencias');

  ws['!cols'] = [
    { wch: 12 }, // No
    { wch: 18 }, // Cédula
    { wch: 14 }, // Tarjeta
    { wch: 32 }, // Nombre
    { wch: 32 }, // Correo
    { wch: 35 }, // Evento
    { wch: 15 }, // Categoría
    { wch: 15 }, // Modalidad
    { wch: 25 }, // Lugar
    { wch: 25 }, // Instructor
    { wch: 15 }, // Fecha
    { wch: 14 }, // Horario
    { wch: 25 }, // Asistencia
    { wch: 25 }  // Estatus
  ];

  XLSX.writeFile(wb, `Libro_Auditoria_Asistencias_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Exporta el Reporte de Calidad Docente y Evaluaciones de Satisfacción
 */
export const exportInstructorsAndFeedbackReportToExcel = (
  events: TrainingEvent[]
): void => {
  const feedbacksData: any[] = [];
  let counter = 1;

  events.forEach(evt => {
    (evt.feedbacks || []).forEach(fb => {
      feedbacksData.push({
        'No.': counter++,
        'Evento / Taller': evt.title,
        'Instructor': evt.instructor,
        'Categoría': evt.category,
        'Modalidad': evt.modality,
        'Colaborador': fb.userName || fb.userEmail,
        'Correo': fb.userEmail,
        'Calificación (1-5)': `${fb.rating} ★`,
        'Comentarios y Retroalimentación': fb.comment || 'Sin comentario',
        'Fecha de Evaluación': fb.createdAt
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(feedbacksData);
  XLSX.utils.book_append_sheet(wb, ws, 'Encuestas de Satisfacción');

  ws['!cols'] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 30 },
    { wch: 30 },
    { wch: 18 },
    { wch: 50 },
    { wch: 20 }
  ];

  XLSX.writeFile(wb, `Reporte_Calidad_Docente_Encuestas_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

