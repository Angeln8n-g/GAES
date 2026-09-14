import * as XLSX from 'xlsx';
import { 
  TrainingEvent, 
  Participant, 
  UserAccount, 
  UserRole, 
  EmploymentStatus,
  ParticipantGroup, 
  TrainingProgram, 
  ProgramComplianceSummary,
  ParticipantGrade,
  OjtChecklist,
  CalibrationSession,
  Company,
  ExternalTraining,
  CreateExternalTrainingPayload,
  TechnicalCohortAttendanceMatrix,
  TechnicalCohortEnrolledParticipant
} from '../types';
import { formatDateLong, formatCedula, isValidCedula, formatDateShort } from './formatters';
import {
  SUSTAINABILITY_PROGRAMS,
  SESSION_TYPES,
  TRAINING_TYPES,
  TRAINING_FORMATS,
  EVENT_MODALITIES,
  getProgramLabel,
  getProgramShortName,
  getSubprogramsForProgram,
  SessionType,
  TrainingType,
  TrainingFormat
} from '../constants/sustainabilityPrograms';

/**
 * Exporta la lista de asistentes de un horario/evento a un archivo Excel (.xlsx)
 */
export const exportAttendeesToExcel = (
  event: TrainingEvent,
  dateStr: string,
  timeStr: string,
  attendeeEmails: string[],
  attendedList: string[] = [],
  allParticipants: Participant[] = [],
  checkInList: string[] = [],
  checkOutList: string[] = [],
  completedList: string[] = []
): void => {
  const activeCheckIn = checkInList.length > 0 ? checkInList : attendedList;
  const activeCheckOut = checkOutList;
  const activeCompleted = completedList.length > 0 ? completedList : attendedList;

  const data = attendeeEmails.map((email, idx) => {
    const participant = allParticipants.find(p => p.email.toLowerCase() === email.toLowerCase());
    const cleanEmail = email.toLowerCase();
    const hasCheckIn = activeCheckIn.map(a => a.toLowerCase()).includes(cleanEmail);
    const hasCheckOut = activeCheckOut.map(a => a.toLowerCase()).includes(cleanEmail);
    const hasCompleted = activeCompleted.map(a => a.toLowerCase()).includes(cleanEmail) || (hasCheckIn && hasCheckOut);
    
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
      'Entrada (Check-In)': hasCheckIn ? 'SÍ (Registrada)' : 'NO (Pendiente)',
      'Salida (Check-Out)': hasCheckOut ? 'SÍ (Registrada)' : 'NO (Pendiente)',
      'Estado Asistencia': hasCompleted ? 'COMPLETA' : (hasCheckIn ? 'EN CURSO' : 'NO ASISTIÓ')
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
    { wch: 14 }, // Horario
    { wch: 12 }, // Modalidad
    { wch: 25 }, // Instructor
    { wch: 22 }, // Entrada
    { wch: 22 }, // Salida
    { wch: 20 }  // Estado Asistencia
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
    'Supervisor Asignado': p.supervisorName || 'Sin asignar',
    'Nivel Educativo': p.educationLevel || 'No especificado',
    'Profesión / Título': p.professionTitle || 'No especificado',
    'Estudia Actualmente': p.isCurrentlyStudying ? 'SÍ' : 'NO',
    'Qué Estudia': p.currentStudyField || '',
    'Institución / Universidad': p.institutionName || '',
    'Fecha de Nacimiento': p.birthDate || '',
    'Teléfono': p.phone || '',
    'Dirección': p.currentAddress || '',
    'Intereses de Desarrollo': (p.trainingInterestAreas || []).join(', '),
    'Ficha Completa': p.profileCompleted ? 'SÍ' : 'NO'
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
    { wch: 25 },
    { wch: 24 },
    { wch: 26 },
    { wch: 20 },
    { wch: 28 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 32 },
    { wch: 40 },
    { wch: 16 }
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
    'Empresa': u.companyId || 'Kasino 21 Corporativo',
    'Departamento': u.department || 'General',
    'Rol en Sistema': u.role,
    'Estado Laboral': u.employmentStatus === 'contratado' ? 'Contratado' : u.employmentStatus === 'en_proceso' ? 'En Proceso' : 'Inactivo',
    'Estado Cuenta': u.isActive !== false ? 'Activo' : 'Inactivo'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
  ws['!cols'] = [
    { wch: 6 },  // No.
    { wch: 20 }, // Cédula
    { wch: 35 }, // Nombre
    { wch: 35 }, // Correo
    { wch: 25 }, // Empresa
    { wch: 22 }, // Departamento
    { wch: 28 }, // Rol
    { wch: 18 }, // Estado Laboral
    { wch: 15 }  // Estado Cuenta
  ];
  XLSX.writeFile(wb, 'Usuarios_CapacitaHub.xlsx');
};

/**
 * Genera y descarga la Plantilla Oficial de Excel para creación masiva de usuarios con todos los campos requeridos
 */
export const downloadUsersTemplateExcel = (): void => {
  const sampleData = [
    {
      'Cédula (000-0000000-0) *': '402-2196163-1',
      'Nombre Completo *': 'Ana Morales Batista',
      'Correo Corporativo *': 'ana.morales@empresa.com',
      'Empresa / Filial (ej. Claro Dominicana)': 'Claro Dominicana',
      'Departamento / Área': 'Tecnología',
      'Rol en Sistema (Colaborador / Tutor OJT / Líder / Administrador / Super Admin)': 'Colaborador (User)',
      'Estado Laboral (Contratado / En Proceso / Inactivo)': 'Contratado',
      'Contraseña Inicial (Opcional)': '123'
    },
    {
      'Cédula (000-0000000-0) *': '001-0876543-2',
      'Nombre Completo *': 'Lic. Carlos Gómez Herrera',
      'Correo Corporativo *': 'carlos.gomez@empresa.com',
      'Empresa / Filial (ej. Claro Dominicana)': 'Kasino 21 Corporativo',
      'Departamento / Área': 'Operaciones',
      'Rol en Sistema (Colaborador / Tutor OJT / Líder / Administrador / Super Admin)': 'Evaluador / Tutor OJT',
      'Estado Laboral (Contratado / En Proceso / Inactivo)': 'Contratado',
      'Contraseña Inicial (Opcional)': '123'
    },
    {
      'Cédula (000-0000000-0) *': '031-0456789-4',
      'Nombre Completo *': 'Ing. Laura Patricia Gómez',
      'Correo Corporativo *': 'laura.gomez@empresa.com',
      'Empresa / Filial (ej. Claro Dominicana)': 'Claro Dominicana',
      'Departamento / Área': 'Tecnología',
      'Rol en Sistema (Colaborador / Tutor OJT / Líder / Administrador / Super Admin)': 'Líder de Área / Supervisor',
      'Estado Laboral (Contratado / En Proceso / Inactivo)': 'Contratado',
      'Contraseña Inicial (Opcional)': '123'
    },
    {
      'Cédula (000-0000000-0) *': '223-0098765-8',
      'Nombre Completo *': 'Lic. Fernando Castillo',
      'Correo Corporativo *': 'fernando.castillo@empresa.com',
      'Empresa / Filial (ej. Claro Dominicana)': 'Kasino 21 Corporativo',
      'Departamento / Área': 'Recursos Humanos',
      'Rol en Sistema (Colaborador / Tutor OJT / Líder / Administrador / Super Admin)': 'Administrador / Editor',
      'Estado Laboral (Contratado / En Proceso / Inactivo)': 'Contratado',
      'Contraseña Inicial (Opcional)': 'admin2026'
    },
    {
      'Cédula (000-0000000-0) *': '001-9876543-1',
      'Nombre Completo *': 'Roberto Díaz Peña',
      'Correo Corporativo *': 'roberto.diaz@empresa.com',
      'Empresa / Filial (ej. Claro Dominicana)': 'Claro Dominicana',
      'Departamento / Área': 'Comercial & Ventas',
      'Rol en Sistema (Colaborador / Tutor OJT / Líder / Administrador / Super Admin)': 'Colaborador (User)',
      'Estado Laboral (Contratado / En Proceso / Inactivo)': 'En Proceso',
      'Contraseña Inicial (Opcional)': '123'
    }
  ];

  const guideData = [
    {
      'Campo': 'Cédula de Identidad *',
      'Obligatorio': 'Requerido / Recomendado',
      'Formato / Opciones': '11 dígitos con guiones (ej. 402-2196163-1 o 001-1928374-5)',
      'Descripción': 'Documento oficial único de identidad para acceso, bitácoras y registros.'
    },
    {
      'Campo': 'Nombre Completo *',
      'Obligatorio': 'Sí (Obligatorio)',
      'Formato / Opciones': 'Texto libre (ej. Ana Morales Batista)',
      'Descripción': 'Nombre y apellidos del colaborador.'
    },
    {
      'Campo': 'Correo Corporativo *',
      'Obligatorio': 'Sí (Obligatorio)',
      'Formato / Opciones': 'ej. nombre.apellido@empresa.com',
      'Descripción': 'Identificador único de inicio de sesión en la plataforma.'
    },
    {
      'Campo': 'Empresa / Filial',
      'Obligatorio': 'Opcional (Defecto: Kasino 21)',
      'Formato / Opciones': 'Claro Dominicana, Kasino 21 Corporativo, etc.',
      'Descripción': 'Empresa a la que pertenece el colaborador.'
    },
    {
      'Campo': 'Departamento / Área',
      'Obligatorio': 'Opcional (Recomendado)',
      'Formato / Opciones': 'Tecnología, Operaciones, Ventas, Recursos Humanos, etc.',
      'Descripción': 'Área o unidad funcional en la estructura organizativa.'
    },
    {
      'Campo': 'Rol en Sistema',
      'Obligatorio': 'Opcional (Defecto: Colaborador)',
      'Formato / Opciones': 'Colaborador (User) | Evaluador / Tutor OJT | Líder de Área / Supervisor | Administrador / Editor | Super Administrador',
      'Descripción': 'Nivel de permisos y accesos dentro del portal.'
    },
    {
      'Campo': 'Estado Laboral',
      'Obligatorio': 'Opcional (Defecto: Contratado)',
      'Formato / Opciones': 'Contratado | En Proceso | Inactivo',
      'Descripción': 'Condición laboral del colaborador.'
    },
    {
      'Campo': 'Contraseña Inicial',
      'Obligatorio': 'Opcional (Defecto: 123)',
      'Formato / Opciones': 'Mínimo 3 caracteres (ej. 123 o clave personalizada)',
      'Descripción': 'Clave inicial asignada para su primer acceso al portal.'
    }
  ];

  const wb = XLSX.utils.book_new();
  
  // Hoja 1: Plantilla de Usuarios
  const ws1 = XLSX.utils.json_to_sheet(sampleData);
  ws1['!cols'] = [
    { wch: 26 }, // Cédula
    { wch: 32 }, // Nombre
    { wch: 35 }, // Correo
    { wch: 35 }, // Empresa
    { wch: 25 }, // Departamento
    { wch: 45 }, // Rol
    { wch: 25 }, // Estado Laboral
    { wch: 28 }  // Contraseña
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Plantilla_Usuarios');

  // Hoja 2: Guía y Catálogo de Campos
  const ws2 = XLSX.utils.json_to_sheet(guideData);
  ws2['!cols'] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 45 },
    { wch: 60 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Guia_y_Catalogo');

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
  if (r.includes('lider') || r.includes('líder') || r.includes('supervisor') || r.includes('lead')) return 'Líder de Área / Supervisor';
  if (r.includes('ojt') || r.includes('tutor') || r.includes('evaluador') || r.includes('coach') || r.includes('mentor') || r.includes('trainer')) return 'Evaluador / Tutor OJT';
  return 'Colaborador (User)';
};

/**
 * Normaliza y mapea cadenas de estado laboral al tipo EmploymentStatus
 */
export const normalizeEmploymentStatus = (rawStatus: string): EmploymentStatus => {
  const s = (rawStatus || '').toLowerCase().trim();
  if (s.includes('inactiv') || s.includes('desvinculad') || s.includes('baja') || s.includes('retirad')) return 'inactivo';
  if (s.includes('proceso') || s.includes('prueb') || s.includes('temporal') || s.includes('seleccion') || s.includes('selección') || s.includes('induccion') || s.includes('inducción')) return 'en_proceso';
  return 'contratado';
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
        let cedulaIdx = header.findIndex((h: string) => h.includes('cedula') || h.includes('cédula') || h.includes('identifica'));
        let nameIdx = header.findIndex((h: string) => h.includes('nombre') || h.includes('name') || h.includes('usuario') || h.includes('colaborador'));
        let emailIdx = header.findIndex((h: string) => h.includes('correo') || h.includes('email') || h.includes('mail'));
        let compIdx = header.findIndex((h: string) => h.includes('empresa') || h.includes('filial') || h.includes('compañ') || h.includes('compan') || h.includes('razon'));
        let deptIdx = header.findIndex((h: string) => h.includes('departamento') || h.includes('area') || h.includes('área') || h.includes('dept'));
        let roleIdx = header.findIndex((h: string) => h.includes('rol') || h.includes('role') || h.includes('perfil') || h.includes('tipo'));
        let statusIdx = header.findIndex((h: string) => h.includes('laboral') || h.includes('estatus') || h.includes('estado') || h.includes('condicion') || h.includes('situacion'));
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
          const rawCompany = compIdx !== -1 ? String(row[compIdx] || '').trim() : '';
          const rawDepartment = deptIdx !== -1 ? String(row[deptIdx] || '').trim() : '';
          const rawRole = roleIdx !== -1 ? String(row[roleIdx] || '').trim() : '';
          const rawStatus = statusIdx !== -1 ? String(row[statusIdx] || '').trim() : '';
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

          // Resolver Empresa si se especificó
          let resolvedCompanyId = 'emp_kasino';
          if (rawCompany) {
            const lowerComp = rawCompany.toLowerCase();
            if (lowerComp.includes('claro') || lowerComp.includes('dom')) {
              resolvedCompanyId = 'emp_claro';
            } else if (lowerComp.includes('kasino')) {
              resolvedCompanyId = 'emp_kasino';
            }
          }

          const empStatus = normalizeEmploymentStatus(rawStatus);

          seenEmails.add(email);
          validUsers.push({
            id: `usr_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
            name,
            email,
            role: normalizeUserRole(rawRole),
            password: password || '123',
            cedula: formattedCedula,
            department: rawDepartment || undefined,
            companyId: resolvedCompanyId,
            employmentStatus: empStatus,
            isActive: empStatus !== 'inactivo'
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
 * Formato esperado: Cédula (opcional), Nombre, Correo, Departamento (opcional), Rol (opcional), Estado (opcional), Contraseña (opcional)
 * Separado por tabulación (\t), coma (,) o punto y coma (;)
 */
export const parseUsersFromText = (text: string): { validUsers: UserAccount[]; invalidRows: Array<{ line: number; text: string; reason: string }> } => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const validUsers: UserAccount[] = [];
  const invalidRows: Array<{ line: number; text: string; reason: string }> = [];
  const seenEmails = new Set<string>();

  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (idx === 0 && (lower.includes('correo') || lower.includes('email') || lower.includes('nombre') || lower.includes('cédula') || lower.includes('cedula'))) {
      return;
    }

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

    let cedulaVal = '';
    let nameVal = '';
    let emailVal = '';
    let deptVal = '';
    let roleVal = '';
    let statusVal = '';
    let passVal = '123';

    if (parts[0].includes('@')) {
      // Formato: Correo, Nombre, ...
      emailVal = parts[0];
      nameVal = parts[1] || '';
      deptVal = parts[2] || '';
      roleVal = parts[3] || '';
      passVal = parts[4] || '123';
    } else if (/^\d{3}/.test(parts[0]) || /^\d{11}$/.test(parts[0].replace(/\D/g, ''))) {
      // Formato: Cédula, Nombre, Correo, [Empresa/Depto], Rol, Estado, Contraseña
      cedulaVal = parts[0];
      nameVal = parts[1] || '';
      emailVal = parts[2] || '';
      deptVal = parts[3] || '';
      roleVal = parts[4] || '';
      statusVal = parts[5] || '';
      passVal = parts[6] || '123';
    } else {
      // Formato: Nombre, Correo, Departamento, Rol, Contraseña
      nameVal = parts[0];
      emailVal = parts[1] || '';
      deptVal = parts[2] || '';
      roleVal = parts[3] || '';
      passVal = parts[4] || '123';
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

    const empStatus = normalizeEmploymentStatus(statusVal);

    seenEmails.add(cleanEmail);
    validUsers.push({
      id: `usr_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
      name: nameVal,
      email: cleanEmail,
      role: normalizeUserRole(roleVal),
      password: passVal || '123',
      cedula: formattedCedula,
      department: deptVal || undefined,
      employmentStatus: empStatus,
      isActive: empStatus !== 'inactivo'
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
        'Puntaje General TEC': `${fb.rating} ★`,
        'Evaluación Curso': fb.courseScore ? `${Number(fb.courseScore).toFixed(1)} ★` : `${fb.rating} ★`,
        'Evaluación Facilitador': fb.facilitatorScore ? `${Number(fb.facilitatorScore).toFixed(1)} ★` : `${fb.rating} ★`,
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

/**
 * Exporta el Libro de Calificaciones de un evento específico
 */
export const exportEventGradesToExcel = (
  event: TrainingEvent,
  participants: Participant[]
): void => {
  const grades = event.grades || [];
  const modules = event.modules || [];
  const hasModules = modules.length > 0;

  const data = grades.map((g, idx) => {
    const p = participants.find(part => part.card === g.participantCard || part.email.toLowerCase() === g.participantEmail?.toLowerCase());
    
    const row: Record<string, any> = {
      'No.': idx + 1,
      'Cédula': p?.cedula || 'N/A',
      'No. Tarjeta': g.participantCard,
      'Nombre del Colaborador': g.participantName || p?.name || 'N/A',
      'Correo Electrónico': g.participantEmail || p?.email || 'N/A',
      'Departamento': g.participantDepartment || p?.department || 'General',
      'Capacitación': event.title,
      'Categoría': event.category,
      'Tipo de Evaluación': hasModules 
        ? `Modular (${modules.length} Módulos)` 
        : (event.evaluationType === 'score_100' ? 'Numérica (0-100)' : event.evaluationType === 'scale_1_5' ? 'Escala (1-5)' : 'Aprobado/Reprobado'),
    };

    // Si tiene módulos definidos, agregar columnas dinámicas por módulo
    if (hasModules) {
      modules.forEach((mod, mIdx) => {
        const mg = (g.moduleGrades || []).find(m => m.moduleId === mod.id);
        const colName = `Módulo ${mIdx + 1}: ${mod.title} (Mín ${mod.passingScore}/${mod.maxScore})`;
        row[colName] = mg && mg.score !== null && mg.score !== undefined
          ? `${mg.score} pts (${mg.academicStatus === 'passed' ? 'Aprobado' : mg.academicStatus === 'failed' ? 'Reprobado' : 'Pendiente'})`
          : 'Pendiente';
      });
    }

    row[hasModules ? 'Promedio Final Obtenido' : 'Calificación Obtenida'] = g.score !== null && g.score !== undefined ? `${g.score} pts` : 'No asignada';
    row['Estado Académico'] = g.academicStatus === 'passed' ? 'APROBADO' : g.academicStatus === 'failed' ? 'REPROBADO' : 'PENDIENTE';
    row['Debilidades / Brechas Detectadas'] = (g.detectedSkillGaps || []).join(', ') || 'Ninguna';
    row['Notas de Debilidad'] = g.weaknessesNotes || '';
    row['Fortalezas Observadas'] = g.strengthsNotes || '';
    row['Requiere Re-capacitación'] = g.needsRetraining ? 'SÍ' : 'NO';
    row['Recomendaciones del Docente'] = g.feedback || '';
    row['Evaluado Por'] = g.gradedBy || 'Instructor';
    row['Fecha de Calificación'] = g.gradedAt || '';

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');

  // Ajustar anchos de columna dinámicamente según las claves del primer registro
  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    ws['!cols'] = keys.map(key => {
      if (key === 'No.') return { wch: 6 };
      if (key === 'Cédula') return { wch: 18 };
      if (key === 'No. Tarjeta') return { wch: 15 };
      if (key.includes('Nombre') || key.includes('Correo')) return { wch: 30 };
      if (key.startsWith('Módulo')) return { wch: 32 };
      if (key.includes('Notas') || key.includes('Debilidades') || key.includes('Fortalezas') || key.includes('Recomendaciones')) return { wch: 35 };
      return { wch: 22 };
    });
  }

  XLSX.writeFile(wb, `Libro_Calificaciones_${event.title.slice(0, 20).replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Exporta el Reporte Integral de Brechas de Habilidades y Detección de Debilidades (Skills Gap)
 */
export const exportSkillsGapReportToExcel = (
  events: TrainingEvent[],
  participants: Participant[],
  allGrades: ParticipantGrade[]
): void => {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Matriz de Calificaciones Global
  const globalGradesData = allGrades.map((g, idx) => {
    const p = participants.find(part => part.card === g.participantCard);
    const evt = events.find(e => e.id === g.eventId);
    return {
      'No.': idx + 1,
      'Cédula': p?.cedula || 'N/A',
      'No. Tarjeta': g.participantCard,
      'Colaborador': g.participantName || p?.name || 'N/A',
      'Correo': g.participantEmail || p?.email || 'N/A',
      'Departamento': g.participantDepartment || p?.department || 'General',
      'Capacitación': g.eventTitle || evt?.title || 'N/A',
      'Nota': g.score !== null ? g.score : 'N/A',
      'Estado': g.academicStatus === 'passed' ? 'Aprobado' : g.academicStatus === 'failed' ? 'Reprobado' : 'Pendiente',
      'Debilidades': (g.detectedSkillGaps || []).join(', ') || 'Ninguna',
      'Detalle de Debilidad': g.weaknessesNotes || '',
      'Fortalezas': g.strengthsNotes || '',
      'Re-capacitación Urgente': g.needsRetraining ? 'SÍ' : 'NO',
      'Evaluador': g.gradedBy || '',
      'Fecha': g.gradedAt || ''
    };
  });

  const wsGrades = XLSX.utils.json_to_sheet(globalGradesData);
  XLSX.utils.book_append_sheet(wb, wsGrades, 'Registro de Notas');

  // Hoja 2: Colaboradores con Necesidad de Refuerzo / Re-capacitación
  const retrainingData = allGrades
    .filter(g => g.needsRetraining || g.academicStatus === 'failed')
    .map((g, idx) => {
      const p = participants.find(part => part.card === g.participantCard);
      const evt = events.find(e => e.id === g.eventId);
      return {
        'Prioridad': idx + 1,
        'No. Tarjeta': g.participantCard,
        'Colaborador': g.participantName || p?.name || 'N/A',
        'Departamento': g.participantDepartment || p?.department || 'General',
        'Curso a Reforzar': g.eventTitle || evt?.title || 'N/A',
        'Nota Obtenida': g.score !== null ? g.score : 'Sin nota',
        'Competencias Débiles': (g.detectedSkillGaps || []).join(', ') || 'General',
        'Observación del Evaluador': g.weaknessesNotes || g.feedback || 'Requiere refuerzo técnico',
        'Supervisor Responsable': p?.supervisorName || 'Sin asignar'
      };
    });

  const wsRetraining = XLSX.utils.json_to_sheet(retrainingData);
  XLSX.utils.book_append_sheet(wb, wsRetraining, 'Plan de Re-capacitación');

  XLSX.writeFile(wb, `Diagnostico_Debilidades_SkillsGap_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Exporta el reporte completo de bitácoras de campo OJT y diagnósticos operativos a Excel (.xlsx)
 */
export const exportOjtChecklistsToExcel = (
  checklists: OjtChecklist[],
  participants: Participant[] = [],
  companies: Company[] = []
): void => {
  const compMap = new Map(companies.map(c => [c.id, c.name]));
  const partMap = new Map(participants.map(p => [p.card, p]));

  const data = checklists.map((c, idx) => {
    const p = partMap.get(c.participantCard);
    const compName = compMap.get(c.companyId) || 'Claro Dominicana';

    const obsTypeLabel = 
      c.observationType === 'daily_observation' ? 'Acompañamiento Diario' :
      c.observationType === 'weekly_evaluation' ? 'Evaluación Semanal' :
      c.observationType === 'cross_audit' ? 'Auditoría Cruzada' :
      c.observationType === 'first_60d_check' ? 'Control 60 Días' : c.observationType;

    const diagLabel = 
      c.operationalStatus === 'compliant' ? 'Conforme a Estándar (Verde)' :
      c.operationalStatus === 'needs_coaching' ? 'Requiere Coaching / Refuerzo (Amarillo)' :
      'Brecha Crítica (Rojo)';

    return {
      'No.': idx + 1,
      'ID Bitácora': c.id,
      'Fecha': c.date,
      'Empresa': compName,
      'No. Tarjeta': c.participantCard,
      'Colaborador': c.participantName || p?.name || 'N/A',
      'Cédula': p?.cedula || 'N/A',
      'Departamento': c.department || p?.department || 'Operaciones',
      'Supervisor Asignado': p?.supervisorName || 'N/A',
      'Evaluador / Tutor OJT': c.evaluatorName,
      'Tipo de Observación': obsTypeLabel,
      'Puntaje de Campo (1-100)': Number(c.overallScore),
      'Diagnóstico Operativo': diagLabel,
      'Protocolo Seguridad EPP': c.safetyProtocolPass ? 'CUMPLE (100%)' : 'NO CUMPLE (Falla Crítica)',
      'First-Time Fix (FTF)': c.firstTimeFixPass ? 'APROBADO (A la primera)' : 'RETRABAJO REQUERIDO',
      'Debilidades Detectadas': (c.weaknessesIdentified || []).join('; ') || 'Ninguna observada',
      'Plan de Acción Inmediato': c.immediateActionPlan || 'Sin plan asignado',
      'Notas / Observaciones': c.notes || ''
    };
  });

  // Hoja 2: Resumen Ejecutivo
  const total = checklists.length;
  const compliant = checklists.filter(c => c.operationalStatus === 'compliant').length;
  const coaching = checklists.filter(c => c.operationalStatus === 'needs_coaching').length;
  const critical = checklists.filter(c => c.operationalStatus === 'critical_gap').length;
  const eppPass = checklists.filter(c => c.safetyProtocolPass).length;
  const ftfPass = checklists.filter(c => c.firstTimeFixPass).length;
  const avgScore = total > 0 ? (checklists.reduce((acc, curr) => acc + Number(curr.overallScore), 0) / total).toFixed(1) : '0';

  const summaryData = [
    { 'Métrica': 'Total de Bitácoras de Campo', 'Valor': total },
    { 'Métrica': 'Promedio General de Desempeño en Campo', 'Valor': `${avgScore} / 100` },
    { 'Métrica': 'Tasa de Conformidad Operativa', 'Valor': total > 0 ? `${Math.round((compliant / total) * 100)}%` : '0%' },
    { 'Métrica': 'Colaboradores Conformes (Verde)', 'Valor': compliant },
    { 'Métrica': 'Colaboradores en Coaching (Amarillo)', 'Valor': coaching },
    { 'Métrica': 'Colaboradores con Brecha Crítica (Rojo)', 'Valor': critical },
    { 'Métrica': 'Adherencia a Seguridad y EPP', 'Valor': total > 0 ? `${Math.round((eppPass / total) * 100)}%` : '0%' },
    { 'Métrica': 'Tasa de First-Time Fix (Resolución a la primera)', 'Valor': total > 0 ? `${Math.round((ftfPass / total) * 100)}%` : '0%' }
  ];

  const wb = XLSX.utils.book_new();
  const wsDetail = XLSX.utils.json_to_sheet(data);
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);

  XLSX.utils.book_append_sheet(wb, wsDetail, 'Bitácoras OJT Campo');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Ejecutivo OJT');

  XLSX.writeFile(wb, `Reporte_Bitacoras_OJT_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Exporta el reporte de sesiones de mesas de calibración a Excel (.xlsx)
 */
export const exportCalibrationsToExcel = (
  calibrations: CalibrationSession[],
  companies: Company[] = []
): void => {
  const compMap = new Map(companies.map(c => [c.id, c.name]));

  const data = calibrations.map((cal, idx) => {
    const compName = compMap.get(cal.companyId) || 'Claro Dominicana';
    return {
      'No.': idx + 1,
      'ID Sesión': cal.id,
      'Fecha': cal.date,
      'Empresa': compName,
      'Título / Motivo': cal.title,
      'Comité / Facilitador': cal.conductedBy,
      'Casos / Participantes Revisados': Number(cal.participantsReviewed),
      'Promedio Teoría (Aula)': Number(cal.averageTheoryScore),
      'Promedio Práctica (Campo)': Number(cal.averageFieldScore),
      'Dispersión / Brecha de Varianza (%)': Number(cal.varianceGapPct),
      'Estado': cal.status === 'completed' ? 'Completada' : cal.status === 'in_progress' ? 'En Progreso' : 'Programada',
      'Hallazgos Clave': cal.keyFindings || '',
      'Acuerdos y Compromisos': cal.actionAgreements || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const wsCalibrations = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, wsCalibrations, 'Mesas de Calibración');

  XLSX.writeFile(wb, `Reporte_Mesas_Calibracion_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Exporta el Libro Integral de Calificaciones de la Sesión para:
 * 1. Plantilla Insumo para Bitácoras de Campo OJT
 * 2. Insumo para Mesas de Calibración (Aula vs Campo)
 * 3. Estadísticas & Métricas de la Sesión
 * 4. Calificaciones Detalladas
 */
export const exportSessionGradesForOjtAndCalibration = (
  event: TrainingEvent,
  participants: Participant[] = [],
  companies: Company[] = []
): void => {
  const grades = event.grades || [];
  const comp = companies.find(c => c.id === (event.companyId || 'emp_kasino'));
  const compName = comp?.name || 'Kasino 21 Corporativo';
  const ojtTutorName = event.ojtEvaluatorName || 'No asignado / Formación general';

  // Participantes inscritos / asistentes si no hay grades directos
  const allAttendeeCards = new Set<string>();
  const attendeeEmailMap = new Map(participants.map(p => [p.email.toLowerCase(), p]));
  const attendeeCardMap = new Map(participants.map(p => [p.card, p]));

  // Recolectar participantes de los slots del evento
  event.schedule.forEach(sch => {
    sch.slots.forEach(slot => {
      slot.attendees.forEach(email => {
        const p = attendeeEmailMap.get(email.toLowerCase());
        if (p) allAttendeeCards.add(p.card);
      });
      (slot.attendedList || []).forEach(email => {
        const p = attendeeEmailMap.get(email.toLowerCase());
        if (p) allAttendeeCards.add(p.card);
      });
    });
  });

  // Si hay grades, agregamos las tarjetas de los evaluados
  grades.forEach(g => allAttendeeCards.add(g.participantCard));

  // Generar lista combinada de participantes
  const participantsInSession: Array<{
    card: string;
    name: string;
    email: string;
    cedula: string;
    department: string;
    grade?: ParticipantGrade;
  }> = [];

  allAttendeeCards.forEach(card => {
    const p = attendeeCardMap.get(card);
    const g = grades.find(grd => grd.participantCard === card);
    participantsInSession.push({
      card,
      name: g?.participantName || p?.name || `Colaborador #${card}`,
      email: g?.participantEmail || p?.email || 'N/A',
      cedula: p?.cedula || 'N/A',
      department: g?.participantDepartment || p?.department || 'General',
      grade: g
    });
  });

  // Si no había asistentes en slots ni grades pero sí grades
  if (participantsInSession.length === 0 && grades.length > 0) {
    grades.forEach(g => {
      const p = attendeeCardMap.get(g.participantCard);
      participantsInSession.push({
        card: g.participantCard,
        name: g.participantName || p?.name || `Colaborador #${g.participantCard}`,
        email: g.participantEmail || p?.email || 'N/A',
        cedula: p?.cedula || 'N/A',
        department: g.participantDepartment || p?.department || 'General',
        grade: g
      });
    });
  }

  // -------------------------------------------------------------
  // HOJA 1: INSUMO PARA BITÁCORAS DE CAMPO OJT (Checklists 70-20-10)
  // -------------------------------------------------------------
  const ojtChecklistInputData = participantsInSession.map((item, idx) => {
    const g = item.grade;
    const scoreText = g?.score !== null && g?.score !== undefined ? `${g.score} pts` : 'Pendiente';
    const academicStatusText = g?.academicStatus === 'passed' ? 'APROBADO EN AULA' : g?.academicStatus === 'failed' ? 'REPROBADO EN AULA' : 'SIN EVALUACIÓN';

    return {
      'No.': idx + 1,
      'No. Tarjeta': item.card,
      'Cédula': item.cedula,
      'Nombre del Colaborador': item.name,
      'Departamento': item.department,
      'Capacitación Teórica': event.title,
      'Instructor de Aula': event.instructor,
      'Tutor OJT Asignado': ojtTutorName,
      'Nota Teoría Aula (% / Pts)': scoreText,
      'Estado Aula': academicStatusText,
      'Habilidades / Competencias a Auditar': (event.skillsEvaluated || []).join(', ') || 'Procedimiento estándar',
      'Debilidades Detectadas en Aula': (g?.detectedSkillGaps || []).join(', ') || 'Ninguna',
      '[CAMPO] Fecha de Observación OJT': '',
      '[CAMPO] Tipo de Observación (Diario/Semanal/60D)': '',
      '[CAMPO] Protocolo Seguridad EPP (SÍ/NO)': '',
      '[CAMPO] First-Time Fix Sin Retrabajo (SÍ/NO)': '',
      '[CAMPO] Puntaje Práctico Obtenido (0-100)': '',
      '[CAMPO] Diagnóstico (Conforme / Coaching / Brecha Crítica)': '',
      '[CAMPO] Plan de Acción Inmediato': ''
    };
  });

  // -------------------------------------------------------------
  // HOJA 2: INSUMO PARA MESAS DE CALIBRACIÓN (Varianza Aula vs Práctica)
  // -------------------------------------------------------------
  const calibrationInputData = participantsInSession.map((item, idx) => {
    const g = item.grade;
    const theoryScore = g?.score !== null && g?.score !== undefined ? Number(g.score) : 0;

    return {
      'Fila': idx + 1,
      'Empresa': compName,
      'Capacitación Evaluada': event.title,
      'No. Tarjeta': item.card,
      'Nombre Colaborador': item.name,
      'Departamento': item.department,
      'Instructor de Aula': event.instructor,
      'Tutor OJT de Campo': ojtTutorName,
      'Nota Aula (Teoría 100)': theoryScore > 0 ? theoryScore : 'Pendiente',
      'Nota Campo (Práctica 100)': '',
      'Dispersión / Varianza Gap (%)': '',
      'Diagnóstico de Calibración': '',
      'Hallazgos / Brecha de Transferencia': g?.weaknessesNotes || '',
      'Acuerdos de Calibración / Ajuste al Estándar': ''
    };
  });

  // -------------------------------------------------------------
  // HOJA 3: ESTADÍSTICAS & RESUMEN EJECUTIVO DE LA SESIÓN
  // -------------------------------------------------------------
  const totalGraded = grades.filter(g => g.score !== null && g.score !== undefined).length;
  const passedCount = grades.filter(g => g.academicStatus === 'passed').length;
  const failedCount = grades.filter(g => g.academicStatus === 'failed').length;
  const retrainingCount = grades.filter(g => g.needsRetraining).length;
  const avgScore = totalGraded > 0
    ? Math.round(grades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / totalGraded)
    : 0;
  const passRate = totalGraded > 0 ? Math.round((passedCount / totalGraded) * 100) : 0;

  // Frecuencia de debilidades detectadas
  const gapCounts: Record<string, number> = {};
  grades.forEach(g => {
    (g.detectedSkillGaps || []).forEach(gap => {
      gapCounts[gap] = (gapCounts[gap] || 0) + 1;
    });
  });
  const topGapsSummary = Object.entries(gapCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([gap, count]) => `${gap} (${count} colaboradores)`)
    .join('; ') || 'Sin debilidades críticas reportadas';

  const statsData = [
    { 'Métrica / Indicador': 'Capacitación Evaluada', 'Valor': event.title, 'Detalle Operativo': `Categoría: ${event.category} • Modalidad: ${event.modality}` },
    { 'Métrica / Indicador': 'Empresa / Sede', 'Valor': compName, 'Detalle Operativo': event.location || 'Instalaciones corporativas' },
    { 'Métrica / Indicador': 'Instructor Docente (Aula)', 'Valor': event.instructor, 'Detalle Operativo': 'Responsable de la formación teórica' },
    { 'Métrica / Indicador': 'Tutor / Evaluador OJT (Campo)', 'Valor': ojtTutorName, 'Detalle Operativo': 'Responsable del acompañamiento y bitácoras en puesto' },
    { 'Métrica / Indicador': 'Total Participantes Registrados', 'Valor': participantsInSession.length, 'Detalle Operativo': 'Inscritos en las fechas del evento' },
    { 'Métrica / Indicador': 'Colaboradores Calificados', 'Valor': totalGraded, 'Detalle Operativo': `${participantsInSession.length - totalGraded} pendientes de nota` },
    { 'Métrica / Indicador': 'Promedio General de la Sesión', 'Valor': `${avgScore} / 100`, 'Detalle Operativo': `Nota mínima de aprobación: ${event.passingScore || 70} pts` },
    { 'Métrica / Indicador': 'Tasa de Aprobación Teórica', 'Valor': `${passRate}%`, 'Detalle Operativo': `${passedCount} aprobados vs ${failedCount} reprobados` },
    { 'Métrica / Indicador': 'Colaboradores que Requieren Re-capacitación', 'Valor': retrainingCount, 'Detalle Operativo': 'Requerimiento señalado por el instructor' },
    { 'Métrica / Indicador': 'Competencias / Habilidades Evaluadas', 'Valor': (event.skillsEvaluated || []).join(', ') || 'Evaluación estándar', 'Detalle Operativo': 'Criterios de evaluación definidos en el programa' },
    { 'Métrica / Indicador': 'Top Debilidades / Brechas Identificadas', 'Valor': topGapsSummary, 'Detalle Operativo': 'Focos de atención para el seguimiento OJT' },
    { 'Métrica / Indicador': 'Fecha de Generación del Reporte', 'Valor': new Date().toLocaleString(), 'Detalle Operativo': 'Plataforma CapacitaHub Claro / GAES' }
  ];

  // -------------------------------------------------------------
  // HOJA 4: CALIFICACIONES DETALLADAS NOMINALES
  // -------------------------------------------------------------
  const detailedGradesData = participantsInSession.map((item, idx) => {
    const g = item.grade;
    return {
      'No.': idx + 1,
      'No. Tarjeta': item.card,
      'Cédula': item.cedula,
      'Nombre del Colaborador': item.name,
      'Correo Electrónico': item.email,
      'Departamento': item.department,
      'Calificación Obtenida': g?.score !== null && g?.score !== undefined ? Number(g.score) : 'No asignada',
      'Estado Académico': g?.academicStatus === 'passed' ? 'APROBADO' : g?.academicStatus === 'failed' ? 'REPROBADO' : 'PENDIENTE',
      'Debilidades Detectadas': (g?.detectedSkillGaps || []).join(', ') || 'Ninguna',
      'Notas de Debilidad': g?.weaknessesNotes || '',
      'Fortalezas Observadas': g?.strengthsNotes || '',
      'Requiere Re-capacitación': g?.needsRetraining ? 'SÍ' : 'NO',
      'Feedback / Recomendaciones': g?.feedback || '',
      'Evaluador': g?.gradedBy || event.instructor,
      'Fecha de Calificación': g?.gradedAt || ''
    };
  });

  // Crear libro de trabajo con todas las hojas
  const wb = XLSX.utils.book_new();

  const wsOjt = XLSX.utils.json_to_sheet(ojtChecklistInputData);
  const wsCalib = XLSX.utils.json_to_sheet(calibrationInputData);
  const wsStats = XLSX.utils.json_to_sheet(statsData);
  const wsDetail = XLSX.utils.json_to_sheet(detailedGradesData);

  // Ancho de columnas optimizado
  wsOjt['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 20 },
    { wch: 30 }, { wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 20 },
    { wch: 35 }, { wch: 30 }, { wch: 24 }, { wch: 26 }, { wch: 22 },
    { wch: 22 }, { wch: 24 }, { wch: 28 }, { wch: 35 }
  ];

  wsCalib['!cols'] = [
    { wch: 6 }, { wch: 24 }, { wch: 30 }, { wch: 14 }, { wch: 28 },
    { wch: 20 }, { wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 18 },
    { wch: 20 }, { wch: 24 }, { wch: 35 }, { wch: 35 }
  ];

  wsStats['!cols'] = [
    { wch: 38 }, { wch: 35 }, { wch: 45 }
  ];

  wsDetail['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 28 },
    { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 30 },
    { wch: 30 }, { wch: 18 }, { wch: 35 }, { wch: 24 }, { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, wsOjt, 'Insumo Bitácoras OJT');
  XLSX.utils.book_append_sheet(wb, wsCalib, 'Insumo Mesas Calibración');
  XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas de Sesión');
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Calificaciones Detalladas');

  const safeEventTitle = event.title.slice(0, 25).replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Reporte_OJT_Calibracion_${safeEventTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Exporta el Diagnóstico de Necesidades de Capacitación (DNC) Ejecutivo en un libro Excel (.xlsx) con 4 hojas profesionales.
 */
export const exportDncReportToExcel = (
  participants: Participant[],
  events: TrainingEvent[],
  educationStats: Array<{
    level: string;
    membersCount: number;
    percentageOfTotal: number;
    avgScore: number;
    passRate: number;
    totalHours: number;
    avgHoursPerMember: string;
  }>,
  trainingInterestsAnalysis: Array<{
    topic: string;
    requestCount: number;
    percentage: number;
    isCovered: boolean;
    coveredEventTitle?: string;
  }>,
  improvementOpportunities: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    recommendation: string;
    impact: string;
  }>,
  activeStudents: Participant[],
  generalStats: {
    totalParticipants: number;
    completedProfilesCount: number;
    profileCompletionRate: number;
    avgAge: number;
    activeStudentsRate: number;
  }
): void => {
  const wb = XLSX.utils.book_new();
  const dateToday = new Date().toISOString().slice(0, 10);

  // -----------------------------------------------------------------
  // HOJA 1: RESUMEN EJECUTIVO DNC & PLANES DE ACCIÓN
  // -----------------------------------------------------------------
  const sheet1Data: any[] = [
    { 'SECCIÓN': 'DIAGNÓSTICO GENERAL DE LA PLANTILLA', 'INDICADOR / VARIABLE': 'Total Colaboradores en Padrón', 'VALOR / RESULTADO': generalStats.totalParticipants, 'NOTAS / INTERPRETACIÓN': 'Población total registrada en el sistema' },
    { 'SECCIÓN': 'DIAGNÓSTICO GENERAL DE LA PLANTILLA', 'INDICADOR / VARIABLE': 'Censo Formativo Completado', 'VALOR / RESULTADO': `${generalStats.profileCompletionRate}% (${generalStats.completedProfilesCount} colaboradores)`, 'NOTAS / INTERPRETACIÓN': 'Colaboradores con ficha sociodemográfica y académica completa' },
    { 'SECCIÓN': 'DIAGNÓSTICO GENERAL DE LA PLANTILLA', 'INDICADOR / VARIABLE': 'Colaboradores Cursando Estudios', 'VALOR / RESULTADO': `${generalStats.activeStudentsRate}% (${activeStudents.length} colaboradores)`, 'NOTAS / INTERPRETACIÓN': 'Plantilla activa cursando carreras universitarias o técnicas' },
    { 'SECCIÓN': 'DIAGNÓSTICO GENERAL DE LA PLANTILLA', 'INDICADOR / VARIABLE': 'Edad Promedio de la Plantilla', 'VALOR / RESULTADO': `${generalStats.avgAge} años`, 'NOTAS / INTERPRETACIÓN': 'Población mayoritariamente en desarrollo laboral continuo' },
    { 'SECCIÓN': '', 'INDICADOR / VARIABLE': '', 'VALOR / RESULTADO': '', 'NOTAS / INTERPRETACIÓN': '' },
    { 'SECCIÓN': 'DISTRIBUCIÓN ACADÉMICA', 'INDICADOR / VARIABLE': 'Nivel Educativo', 'VALOR / RESULTADO': 'Colaboradores (% Población)', 'NOTAS / INTERPRETACIÓN': 'Horas Formación Acumuladas' },
    ...educationStats.map(e => ({
      'SECCIÓN': 'DISTRIBUCIÓN ACADÉMICA',
      'INDICADOR / VARIABLE': e.level,
      'VALOR / RESULTADO': `${e.membersCount} colaboradores (${e.percentageOfTotal}%)`,
      'NOTAS / INTERPRETACIÓN': `${e.totalHours} hrs acumuladas (Promedio: ${e.avgHoursPerMember} hrs/colaborador)`
    })),
    { 'SECCIÓN': '', 'INDICADOR / VARIABLE': '', 'VALOR / RESULTADO': '', 'NOTAS / INTERPRETACIÓN': '' },
    { 'SECCIÓN': 'PLAN DE ACCIÓN RECOMENDADO', 'INDICADOR / VARIABLE': 'Prioridad & Categoría', 'VALOR / RESULTADO': 'Hallazgo / Brecha Detectada', 'NOTAS / INTERPRETACIÓN': 'Recomendación Estratégica' },
    ...improvementOpportunities.map(opp => ({
      'SECCIÓN': 'PLAN DE ACCIÓN RECOMENDADO',
      'INDICADOR / VARIABLE': `[${opp.impact.toUpperCase()}] ${opp.category}`,
      'VALOR / RESULTADO': `${opp.title}: ${opp.description}`,
      'NOTAS / INTERPRETACIÓN': opp.recommendation
    }))
  ];

  const wsSummary = XLSX.utils.json_to_sheet(sheet1Data);
  wsSummary['!cols'] = [
    { wch: 32 }, // Sección
    { wch: 35 }, // Indicador / Variable
    { wch: 45 }, // Valor / Resultado
    { wch: 65 }  // Notas / Interpretación
  ];

  // -----------------------------------------------------------------
  // HOJA 2: MATRIZ DNC (DEMANDA DE CAPACITACIÓN VS OFERTA EN CATÁLOGO)
  // -----------------------------------------------------------------
  const sheet2Data = trainingInterestsAnalysis.map((item, idx) => ({
    'No.': idx + 1,
    'Temática / Área Formativa Solicitada': item.topic,
    'Colaboradores Solicitantes': item.requestCount,
    '% de Plantilla que lo Solicita': `${item.percentage}%`,
    'Estatus en Catálogo Actual': item.isCovered ? 'CUBIERTO EN CATÁLOGO' : 'BRECHA DE OFERTA',
    'Curso Asociado en Catálogo': item.coveredEventTitle || 'Ninguno (No existe en catálogo actual)',
    'Acción Formativa Sugerida': item.isCovered 
      ? 'Aperturar nuevos grupos / horarios para atender la alta demanda' 
      : 'Diseñar y programar nuevo evento o taller en el plan del próximo trimestre'
  }));

  const wsDncMatrix = XLSX.utils.json_to_sheet(sheet2Data);
  wsDncMatrix['!cols'] = [
    { wch: 6 },
    { wch: 42 },
    { wch: 25 },
    { wch: 28 },
    { wch: 24 },
    { wch: 40 },
    { wch: 55 }
  ];

  // -----------------------------------------------------------------
  // HOJA 3: CORRELACIÓN DE RENDIMIENTO POR NIVEL EDUCATIVO
  // -----------------------------------------------------------------
  const sheet3Data = educationStats.map((item, idx) => {
    let diagnostico = 'Desempeño estándar';
    let recomendacion = 'Continuar con el itinerario de capacitación planificado.';
    if (item.level === 'Secundaria / Bachiller') {
      diagnostico = item.avgScore < 75 ? 'Brecha técnica detectada' : 'Desempeño satisfactorio';
      recomendacion = 'Se recomienda programar módulos propedéuticos y talleres de nivelación previa para fortalecer fundamentos.';
    } else if (item.level.includes('Universitario') || item.level.includes('Profesional')) {
      diagnostico = 'Alto desempeño técnico y velocidad de asimilación';
      recomendacion = 'Perfil idóneo para cursos avanzados, certificaciones especializadas y liderazgo de proyectos OJT.';
    }

    return {
      'No.': idx + 1,
      'Nivel Educativo de los Colaboradores': item.level,
      'Total de Colaboradores en este Nivel': item.membersCount,
      '% del Padrón': `${item.percentageOfTotal}%`,
      'Nota Promedio en Evaluaciones': `${item.avgScore} / 100`,
      'Tasa de Aprobación Global': `${item.passRate}%`,
      'Horas de Capacitación Acumuladas': `${item.totalHours} hrs`,
      'Promedio de Horas / Colaborador': `${item.avgHoursPerMember} hrs`,
      'Diagnóstico Pedagógico': diagnostico,
      'Recomendación Estratégica': recomendacion
    };
  });

  const wsCorrelation = XLSX.utils.json_to_sheet(sheet3Data);
  wsCorrelation['!cols'] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 25 },
    { wch: 14 },
    { wch: 25 },
    { wch: 22 },
    { wch: 26 },
    { wch: 25 },
    { wch: 35 },
    { wch: 55 }
  ];

  // -----------------------------------------------------------------
  // HOJA 4: DIRECTORIO DE ESTUDIANTES ACTIVOS & SINERGIA OJT
  // -----------------------------------------------------------------
  const sheet4Data = activeStudents.map((s, idx) => ({
    'No.': idx + 1,
    'No. Tarjeta': s.card,
    'Cédula': s.cedula || 'N/A',
    'Colaborador': s.name,
    'Correo Electrónico': s.email,
    'Departamento': s.department || 'Sin Depto',
    'Nivel Educativo Actual': s.educationLevel || 'Universitario en Curso',
    'Carrera / Especialidad que Cursa': s.currentStudyField || 'No especificada',
    'Institución Educativa': s.institutionName || 'No especificada',
    'Teléfono': s.phone || 'N/A',
    'Dirección': s.currentAddress || 'N/A',
    'Áreas de Interés Formativo': (s.trainingInterestAreas || []).join(', ') || 'General',
    'Oportunidad Sinergia OJT (70-20-10)': `Alinear asignaciones de campo con sus estudios de ${s.currentStudyField || 'su carrera'}`
  }));

  const wsStudents = XLSX.utils.json_to_sheet(sheet4Data);
  wsStudents['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 18 },
    { wch: 32 },
    { wch: 30 },
    { wch: 24 },
    { wch: 26 },
    { wch: 35 },
    { wch: 28 },
    { wch: 16 },
    { wch: 30 },
    { wch: 35 },
    { wch: 45 }
  ];

  // Ensamblar libro de trabajo
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Ejecutivo DNC');
  XLSX.utils.book_append_sheet(wb, wsDncMatrix, 'Matriz DNC Demanda');
  XLSX.utils.book_append_sheet(wb, wsCorrelation, 'Correlación Rendimiento');
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Estudiantes Activos OJT');

  const fileName = `Informe_Ejecutivo_DNC_${dateToday}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Exporta el Reporte Oficial del Programa de Sustentabilidad y Capacitaciones
 * con las 11 dimensiones requeridas para auditorías corporativas Claro.
 */
export const exportSustainabilityAndTrainingReportToExcel = (
  events: TrainingEvent[],
  allParticipants: Participant[] = []
): void => {
  const wb = XLSX.utils.book_new();
  const dateToday = new Date().toISOString().split('T')[0];

  // 1. Hoja Principal: Matriz Oficial de 11 Columnas
  const mainSheetData = events.map((evt, idx) => {
    const isSust = (
      evt.subprogram?.toLowerCase().includes('sustentabilidad') ||
      evt.programCategory === 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad'
    );

    // Calcular cupos, inscritos y asistencias
    let totalCap = 0;
    let totalReg = 0;
    let totalAtt = 0;

    evt.schedule.forEach(sch => {
      sch.slots.forEach(sl => {
        totalCap += sl.capacity;
        totalReg += sl.registered;
        totalAtt += (sl.completedAttendanceList || sl.attendedList || []).length;
      });
    });

    const hours = Number(evt.totalHours) || 0;
    const manHours = hours * (totalAtt > 0 ? totalAtt : totalReg);

    const fDesde = evt.startDate || (evt.schedule[0] ? evt.schedule[0].date : '');
    const lastSch = evt.schedule[evt.schedule.length - 1];
    const fHasta = evt.endDate || (lastSch ? (lastSch.endDate || lastSch.date) : '');

    return {
      'No.': idx + 1,
      'Tipo de sesión': evt.sessionType || 'Sincrónica',
      'Tipo de entrenamiento': evt.trainingType || 'Técnico',
      'Formato capacitación': evt.trainingFormat || evt.category || 'Taller',
      'Modalidad': evt.modality === 'Híbrida' ? 'Mixta' : evt.modality,
      'Programa': evt.programCategory || 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad',
      'Subprograma': evt.subprogram || 'Sustentabilidad',
      'Fecha desde': fDesde,
      'Fecha hasta': fHasta,
      'Duración horas': hours,
      'Suplidor': evt.supplier || 'Claro',
      'Descripción': evt.description || 'Sin descripción detallada',
      'Título Capacitación': evt.title,
      'Facilitador': evt.instructor,
      'Cupos Ofertados': totalCap,
      'Inscritos': totalReg,
      'Asistencias Confirmadas': totalAtt,
      'Horas-Hombre Totales': manHours,
      'Alineado a Sustentabilidad': isSust ? 'SÍ (Prioritario)' : 'NO'
    };
  });

  const wsMain = XLSX.utils.json_to_sheet(mainSheetData);
  wsMain['!cols'] = [
    { wch: 6 },  // No.
    { wch: 16 }, // Tipo de sesión
    { wch: 22 }, // Tipo de entrenamiento
    { wch: 22 }, // Formato capacitación
    { wch: 14 }, // Modalidad
    { wch: 45 }, // Programa
    { wch: 30 }, // Subprograma
    { wch: 14 }, // Fecha desde
    { wch: 14 }, // Fecha hasta
    { wch: 16 }, // Duración horas
    { wch: 18 }, // Suplidor
    { wch: 55 }, // Descripción
    { wch: 35 }, // Título
    { wch: 28 }, // Facilitador
    { wch: 16 }, // Cupos
    { wch: 14 }, // Inscritos
    { wch: 22 }, // Asistencias
    { wch: 22 }, // Horas-Hombre
    { wch: 24 }  // Sustentabilidad
  ];

  // 2. Hoja 2: Resumen Consolidado por Programa
  const programTotals: Record<string, { count: number; hours: number; reg: number; att: number; manHours: number }> = {};
  
  events.forEach(evt => {
    const pKey = evt.programCategory || 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad';
    if (!programTotals[pKey]) {
      programTotals[pKey] = { count: 0, hours: 0, reg: 0, att: 0, manHours: 0 };
    }
    const h = Number(evt.totalHours) || 0;
    let reg = 0;
    let att = 0;
    evt.schedule.forEach(s => s.slots.forEach(sl => {
      reg += sl.registered;
      att += (sl.completedAttendanceList || sl.attendedList || []).length;
    }));
    programTotals[pKey].count += 1;
    programTotals[pKey].hours += h;
    programTotals[pKey].reg += reg;
    programTotals[pKey].att += att;
    programTotals[pKey].manHours += (h * (att > 0 ? att : reg));
  });

  const totalAllHours = Object.values(programTotals).reduce((a, b) => a + b.hours, 0) || 1;

  const summarySheetData = Object.entries(programTotals).map(([pKey, stat], i) => ({
    'No.': i + 1,
    'Programa Corporativo': pKey,
    'Cantidad de Cursos': stat.count,
    'Horas Formativas': stat.hours,
    '% del Total de Horas': `${Math.round((stat.hours / totalAllHours) * 100)}%`,
    'Inscritos': stat.reg,
    'Asistencias Confirmadas': stat.att,
    'Horas-Hombre Totales': stat.manHours,
    'Enfoque Sustentabilidad': pKey === 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad' ? 'ALINEADO ESG' : 'OPERATIVO'
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
  wsSummary['!cols'] = [
    { wch: 6 },
    { wch: 50 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
    { wch: 24 },
    { wch: 22 },
    { wch: 24 }
  ];

  // Ensamblar libro de trabajo
  XLSX.utils.book_append_sheet(wb, wsMain, 'Reporte Sustentabilidad Oficial');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Programas');

  const fileName = `Reporte_Sustentabilidad_Capacitaciones_Claro_${dateToday}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// =========================================================================
// UTILIDADES PARA CAPACITACIONES EXTERNAS (HISTÓRICO & CARGA MASIVA)
// =========================================================================

export const formatExcelDate = (val: any): string => {
  if (!val && val !== 0) return '';
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const y = parsed.y;
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {}
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }
  const dateObj = new Date(s);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }
  return s;
};

export const normalizeProgramCategory = (raw: string): string => {
  if (!raw) return 'Capacitacion_tecnologica_digital';
  const clean = raw.trim().toLowerCase();
  if (clean.includes('comerc') || clean.includes('client') || clean.includes('market')) {
    return 'Capacitacion_comercial_atencion_clientes_marketing';
  }
  if (clean.includes('tecnol') || clean.includes('digit') || clean.includes('soft') || clean.includes('base de datos') || clean.includes('ciber') || clean.includes('seguridad inform') || clean.includes('sistema oper')) {
    return 'Capacitacion_tecnologica_digital';
  }
  if (clean.includes('corp') || clean.includes('finanz') || clean.includes('calidad') || clean.includes('agil') || clean.includes('normat')) {
    return 'Capacitacion_corporativa';
  }
  if (clean.includes('talento') || clean.includes('lider') || clean.includes('aprendiz') || clean.includes('estrateg')) {
    return 'Capacitacion_gestion_desarrollo_del_talento';
  }
  if (clean.includes('humano') || clean.includes('asume') || clean.includes('bienestar')) {
    return 'Capacitacion_desarrollo_humano';
  }
  if (clean.includes('salud') || clean.includes('higiene') || clean.includes('riesgo') || clean.includes('sustent') || clean.includes('sst') || clean.includes('proteccion civil')) {
    return 'Capacitacion_seguridad_salud_en_el_trabajo_y_sustentabilidad';
  }
  const exact = SUSTAINABILITY_PROGRAMS.find(p => p.id.toLowerCase() === clean);
  if (exact) return exact.id;
  return 'Capacitacion_tecnologica_digital';
};

export const normalizeSubprogram = (programId: string, rawSub: string): string => {
  const subs = getSubprogramsForProgram(programId);
  if (!rawSub || !rawSub.trim()) return subs[0] || 'General';
  const clean = rawSub.trim().toLowerCase();
  const found = subs.find(s => s.toLowerCase() === clean || clean.includes(s.toLowerCase()) || s.toLowerCase().includes(clean));
  return found || rawSub.trim();
};

export const normalizeSessionType = (raw: string): string => {
  if (!raw) return 'Asincrónica';
  const clean = raw.trim().toLowerCase();
  if (clean.includes('sincr') || clean.includes('vivo') || clean.includes('directo')) return 'Sincrónica';
  if (clean.includes('hibr') || clean.includes('mixt')) return 'Híbrido';
  return 'Asincrónica';
};

export const normalizeTrainingType = (raw: string): string => {
  if (!raw) return 'Técnico';
  const clean = raw.trim().toLowerCase();
  if (clean.includes('conduct') || clean.includes('blanda') || clean.includes('human')) return 'Conductual';
  return 'Técnico';
};

export const normalizeTrainingFormat = (raw: string): string => {
  if (!raw) return 'Curso';
  const clean = raw.trim().toLowerCase();
  if (clean.includes('diplom')) return 'Diplomado';
  if (clean.includes('certif')) return 'Certificación';
  if (clean.includes('taller')) return 'Taller';
  if (clean.includes('webinar')) return 'Webinar';
  if (clean.includes('charla')) return 'Charla';
  if (clean.includes('workshop')) return 'Workshop';
  if (clean.includes('seminar')) return 'Seminario';
  if (clean.includes('cine')) return 'Cinefórum';
  return 'Curso';
};

export const normalizeModality = (raw: string): string => {
  if (!raw) return 'Virtual';
  const clean = raw.trim().toLowerCase();
  if (clean.includes('presenc')) return 'Presencial';
  if (clean.includes('mixt') || clean.includes('hibr')) return 'Mixta';
  return 'Virtual';
};

export const normalizeAcademicStatus = (raw: string): string => {
  if (!raw) return 'passed';
  const clean = raw.trim().toLowerCase();
  if (clean.includes('aprob') || clean.includes('pass') || clean.includes('certif')) return 'passed';
  if (clean.includes('complet') || clean.includes('asist')) return 'completed';
  if (clean.includes('reprob') || clean.includes('no aprob') || clean.includes('fail')) return 'failed';
  if (clean.includes('curso') || clean.includes('progress')) return 'in_progress';
  return 'passed';
};

/**
 * Descarga la plantilla oficial en Excel (.xlsx) para la carga masiva de capacitaciones externas
 */
export const downloadExternalTrainingsTemplateExcel = (participants: Participant[] = []): void => {
  const wb = XLSX.utils.book_new();

  const sampleData = [
    {
      'Identificación del Colaborador (Cédula o Tarjeta o Correo) *': '402-2194060-0',
      'Nombre del Colaborador (Informativo)': 'Angel Santana',
      'Título de la Capacitación Externa *': 'Certificación AWS Solutions Architect Associate',
      'Suplidor / Entidad Emisora *': 'Amazon Web Services / Pearson VUE',
      'Programa de Sustentabilidad *': 'Tecnología & Digital',
      'Subprograma': 'Desarrollo de software',
      'Formato de Capacitación': 'Certificación',
      'Tipo de Sesión': 'Asincrónica',
      'Tipo de Entrenamiento': 'Técnico',
      'Modalidad': 'Virtual',
      'Fecha Inicio (AAAA-MM-DD) *': '2026-08-01',
      'Fecha Fin (AAAA-MM-DD) *': '2026-08-25',
      'Horas Acreditadas *': 48,
      'Estatus Académico (Aprobado / Completado / Reprobado)': 'Aprobado',
      'Calificación Obtenida (0-100)': 92,
      'Folio / No. Certificado': 'AWS-SAA-89152026',
      'URL Credencial Digital': 'https://aws.amazon.com/verification/AWS-CERT-8915',
      'Descripción / Temario': 'Diseño y despliegue de arquitecturas en la nube escalables, seguras y de alta disponibilidad.'
    },
    {
      'Identificación del Colaborador (Cédula o Tarjeta o Correo) *': '001-0876543-2',
      'Nombre del Colaborador (Informativo)': 'Carlos Gómez Herrera',
      'Título de la Capacitación Externa *': 'Diplomado en Gestión Integral de Ciberseguridad',
      'Suplidor / Entidad Emisora *': 'INFOTEP',
      'Programa de Sustentabilidad *': 'Tecnología & Digital',
      'Subprograma': 'Seguridad informática',
      'Formato de Capacitación': 'Diplomado',
      'Tipo de Sesión': 'Sincrónica',
      'Tipo de Entrenamiento': 'Técnico',
      'Modalidad': 'Presencial',
      'Fecha Inicio (AAAA-MM-DD) *': '2026-06-10',
      'Fecha Fin (AAAA-MM-DD) *': '2026-07-28',
      'Horas Acreditadas *': 60,
      'Estatus Académico (Aprobado / Completado / Reprobado)': 'Aprobado',
      'Calificación Obtenida (0-100)': 96,
      'Folio / No. Certificado': 'INF-DIP-2026-0412',
      'URL Credencial Digital': '',
      'Descripción / Temario': 'Fundamentos y gestión de incidentes, análisis forense y normativas ISO 27001.'
    },
    {
      'Identificación del Colaborador (Cédula o Tarjeta o Correo) *': '031-0456789-4',
      'Nombre del Colaborador (Informativo)': 'Laura Patricia Gómez',
      'Título de la Capacitación Externa *': 'Taller Práctico de Liderazgo y Equipos Ágiles',
      'Suplidor / Entidad Emisora *': 'INTEC Consultores',
      'Programa de Sustentabilidad *': 'Gestión del Talento',
      'Subprograma': 'Liderazgo',
      'Formato de Capacitación': 'Taller',
      'Tipo de Sesión': 'Sincrónica',
      'Tipo de Entrenamiento': 'Conductual',
      'Modalidad': 'Mixta',
      'Fecha Inicio (AAAA-MM-DD) *': '2026-07-05',
      'Fecha Fin (AAAA-MM-DD) *': '2026-07-15',
      'Horas Acreditadas *': 24,
      'Estatus Académico (Aprobado / Completado / Reprobado)': 'Completado',
      'Calificación Obtenida (0-100)': 88,
      'Folio / No. Certificado': 'INTEC-LID-2026-88',
      'URL Credencial Digital': '',
      'Descripción / Temario': 'Dinámicas de comunicación asertiva, resolución de conflictos y facilitación ágil.'
    }
  ];

  const ws1 = XLSX.utils.json_to_sheet(sampleData);
  ws1['!cols'] = [
    { wch: 32 }, // Identificación
    { wch: 28 }, // Nombre
    { wch: 45 }, // Título
    { wch: 32 }, // Suplidor
    { wch: 25 }, // Programa
    { wch: 25 }, // Subprograma
    { wch: 20 }, // Formato
    { wch: 18 }, // Tipo Sesión
    { wch: 20 }, // Tipo Entren
    { wch: 15 }, // Modalidad
    { wch: 18 }, // Fecha Inicio
    { wch: 18 }, // Fecha Fin
    { wch: 16 }, // Horas
    { wch: 20 }, // Estatus
    { wch: 20 }, // Calificación
    { wch: 22 }, // Folio
    { wch: 35 }, // URL
    { wch: 45 }  // Descripción
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Plantilla_Capacitaciones_Ext');

  const guideRows = [
    { Campo: 'Identificación del Colaborador *', Requerido: 'OBLIGATORIO', Formato: 'Cédula (000-0000000-0), No. Tarjeta (ej. 8915) o Correo corporativo', Explicación: 'Permite asociar el registro al colaborador en el padrón oficial.' },
    { Campo: 'Título de la Capacitación *', Requerido: 'OBLIGATORIO', Formato: 'Texto libre', Explicación: 'Nombre del curso, diplomado o certificación acreditada.' },
    { Campo: 'Suplidor / Entidad Emisora *', Requerido: 'OBLIGATORIO', Formato: 'Texto libre (ej. INFOTEP, Microsoft, Platzi)', Explicación: 'Institución o empresa que impartió o emitió la credencial.' },
    { Campo: 'Programa de Sustentabilidad *', Requerido: 'OBLIGATORIO', Formato: 'Comercial & Clientes | Tecnología & Digital | Corporativa | Gestión del Talento | Desarrollo Humano | SST & Sustentabilidad', Explicación: 'Eje del programa oficial Claro al que tributa la formación.' },
    { Campo: 'Subprograma', Requerido: 'RECOMENDADO', Formato: 'Según el programa (ej. Desarrollo de software, Ciberseguridad, Liderazgo, etc.)', Explicación: 'Subcategoría temática del programa de sustentabilidad.' },
    { Campo: 'Formato de Capacitación', Requerido: 'OPCIONAL (Defecto: Curso)', Formato: 'Curso | Taller | Diplomado | Certificación | Webinar | Charla | Workshop | Seminario', Explicación: 'Estructura pedagógica del evento formativo.' },
    { Campo: 'Tipo de Sesión', Requerido: 'OPCIONAL (Defecto: Asincrónica)', Formato: 'Asincrónica | Sincrónica | Híbrido', Explicación: 'Modalidad de interacción temporal con el facilitador.' },
    { Campo: 'Tipo de Entrenamiento', Requerido: 'OPCIONAL (Defecto: Técnico)', Formato: 'Técnico | Conductual', Explicación: 'Tipo de competencia desarrollada.' },
    { Campo: 'Modalidad', Requerido: 'OPCIONAL (Defecto: Virtual)', Formato: 'Virtual | Presencial | Mixta', Explicación: 'Entorno de impartición de las clases.' },
    { Campo: 'Fecha Inicio y Fin *', Requerido: 'OBLIGATORIO', Formato: 'AAAA-MM-DD o DD/MM/AAAA (ej. 2026-08-01)', Explicación: 'Periodo de ejecución de la capacitación externa.' },
    { Campo: 'Horas Acreditadas *', Requerido: 'OBLIGATORIO', Formato: 'Número mayor a 0 (ej. 40, 20.5)', Explicación: 'Cantidad de horas que se sumarán al histórico formativo.' },
    { Campo: 'Estatus Académico', Requerido: 'OPCIONAL (Defecto: Aprobado)', Formato: 'Aprobado | Completado | Reprobado', Explicación: 'Resultado final obtenido por el colaborador.' },
    { Campo: 'Calificación Obtenida', Requerido: 'OPCIONAL', Formato: 'Número entre 0 y 100 (ej. 95.5)', Explicación: 'Nota numérica si aplica.' },
    { Campo: 'Folio / Certificado', Requerido: 'OPCIONAL', Formato: 'Texto / Código alfanumérico', Explicación: 'Código de certificado o número de folio oficial.' },
    { Campo: 'URL Credencial', Requerido: 'OPCIONAL', Formato: 'Enlace web https://...', Explicación: 'Link para verificar el certificado o insignia digital.' }
  ];
  const ws2 = XLSX.utils.json_to_sheet(guideRows);
  ws2['!cols'] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 40 },
    { wch: 55 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Catalogo_y_Reglas');

  if (participants && participants.length > 0) {
    const dirData = participants.map((p, i) => ({
      'No.': i + 1,
      'Cédula': p.cedula || 'N/A',
      'No. Tarjeta': p.card,
      'Nombre Completo': p.name,
      'Correo Corporativo': p.email,
      'Departamento': p.department || 'General'
    }));
    const ws3 = XLSX.utils.json_to_sheet(dirData);
    ws3['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 14 },
      { wch: 32 },
      { wch: 32 },
      { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'Directorio_Colaboradores');
  }

  XLSX.writeFile(wb, 'Plantilla_Carga_Masiva_Capacitaciones_Externas.xlsx');
};

/**
 * Parsea un archivo Excel (.xlsx / .xls) de capacitaciones externas
 */
export const parseExternalTrainingsExcelFile = async (
  file: File,
  participants: Participant[]
): Promise<{ validTrainings: CreateExternalTrainingPayload[]; invalidRows: Array<{ row: number; data: any; reason: string }> }> => {
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

        // Crear mapas de resolución rápida de colaboradores
        const pByCard = new Map<string, Participant>();
        const pByCedula = new Map<string, Participant>();
        const pByEmail = new Map<string, Participant>();

        participants.forEach(p => {
          if (p.card) pByCard.set(p.card.trim().toLowerCase(), p);
          if (p.cedula) {
            pByCedula.set(p.cedula.replace(/\D/g, ''), p);
            pByCedula.set(p.cedula.trim(), p);
          }
          if (p.email) pByEmail.set(p.email.trim().toLowerCase(), p);
        });

        // Detectar columnas
        const header = rows[0].map((h: any) => String(h || '').toLowerCase().trim());

        const idIdx = header.findIndex((h: string) => h.includes('identifica') || h.includes('cedula') || h.includes('cédula') || h.includes('tarjeta') || h.includes('correo') || h.includes('email') || h.includes('colaborador'));
        const titleIdx = header.findIndex((h: string) => h.includes('título') || h.includes('titulo') || h.includes('capacitacion') || h.includes('capacitación') || h.includes('curso') || h.includes('nombre de la'));
        const supplierIdx = header.findIndex((h: string) => h.includes('suplidor') || h.includes('proveedor') || h.includes('entidad') || h.includes('instituc') || h.includes('emisor'));
        const progIdx = header.findIndex((h: string) => h.includes('programa') && !h.includes('sub'));
        const subProgIdx = header.findIndex((h: string) => h.includes('subprograma'));
        const formatIdx = header.findIndex((h: string) => h.includes('formato'));
        const sessionIdx = header.findIndex((h: string) => h.includes('sesion') || h.includes('sesión'));
        const typeIdx = header.findIndex((h: string) => (h.includes('tipo') && h.includes('entren')) || h.includes('conductual') || h.includes('técnico'));
        const modalityIdx = header.findIndex((h: string) => h.includes('modalidad'));
        const startIdx = header.findIndex((h: string) => h.includes('inicio') || h.includes('desde') || h.includes('start'));
        const endIdx = header.findIndex((h: string) => h.includes('fin') || h.includes('hasta') || h.includes('culmina') || h.includes('end'));
        const hoursIdx = header.findIndex((h: string) => h.includes('hora') || h.includes('duracion') || h.includes('duración'));
        const statusIdx = header.findIndex((h: string) => h.includes('estatus') || h.includes('estado') || h.includes('culminacion') || h.includes('aprobado'));
        const scoreIdx = header.findIndex((h: string) => h.includes('calific') || h.includes('nota') || h.includes('score') || h.includes('puntos'));
        const certIdx = header.findIndex((h: string) => h.includes('folio') || h.includes('certif') || h.includes('codigo') || h.includes('código'));
        const urlIdx = header.findIndex((h: string) => h.includes('url') || h.includes('link') || h.includes('enlace') || h.includes('credencial'));
        const descIdx = header.findIndex((h: string) => h.includes('descrip') || h.includes('temario') || h.includes('alcance') || h.includes('detalle'));

        const validTrainings: CreateExternalTrainingPayload[] = [];
        const invalidRows: Array<{ row: number; data: any; reason: string }> = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawId = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
          const rawTitle = titleIdx !== -1 ? String(row[titleIdx] || '').trim() : '';
          const rawSupplier = supplierIdx !== -1 ? String(row[supplierIdx] || '').trim() : '';
          const rawProg = progIdx !== -1 ? String(row[progIdx] || '').trim() : '';
          const rawSubProg = subProgIdx !== -1 ? String(row[subProgIdx] || '').trim() : '';
          const rawFormat = formatIdx !== -1 ? String(row[formatIdx] || '').trim() : '';
          const rawSession = sessionIdx !== -1 ? String(row[sessionIdx] || '').trim() : '';
          const rawType = typeIdx !== -1 ? String(row[typeIdx] || '').trim() : '';
          const rawModality = modalityIdx !== -1 ? String(row[modalityIdx] || '').trim() : '';
          const rawStart = startIdx !== -1 ? formatExcelDate(row[startIdx]) : '';
          const rawEnd = endIdx !== -1 ? formatExcelDate(row[endIdx]) : rawStart;
          const rawHours = hoursIdx !== -1 ? Number(row[hoursIdx]) : 0;
          const rawStatus = statusIdx !== -1 ? String(row[statusIdx] || '').trim() : '';
          const rawScore = scoreIdx !== -1 && row[scoreIdx] !== undefined && row[scoreIdx] !== '' ? Number(row[scoreIdx]) : null;
          const rawCert = certIdx !== -1 ? String(row[certIdx] || '').trim() : '';
          const rawUrl = urlIdx !== -1 ? String(row[urlIdx] || '').trim() : '';
          const rawDesc = descIdx !== -1 ? String(row[descIdx] || '').trim() : '';

          // 1. Validar Identificación del colaborador
          if (!rawId) {
            invalidRows.push({ row: i + 1, data: row, reason: 'Falta la identificación del colaborador (Cédula, Tarjeta o Correo).' });
            continue;
          }

          // Resolver participante
          let matchedPart: Participant | undefined = undefined;
          matchedPart = pByCard.get(rawId.toLowerCase());
          if (!matchedPart) {
            matchedPart = pByCedula.get(rawId.replace(/\D/g, '')) || pByCedula.get(rawId);
          }
          if (!matchedPart) {
            matchedPart = pByEmail.get(rawId.toLowerCase());
          }

          if (!matchedPart) {
            invalidRows.push({
              row: i + 1,
              data: row,
              reason: `No se encontró en el padrón ningún colaborador con la identificación "${rawId}".`
            });
            continue;
          }

          // 2. Validar Título
          if (!rawTitle) {
            invalidRows.push({ row: i + 1, data: row, reason: 'El título o nombre de la capacitación externa es obligatorio.' });
            continue;
          }

          // 3. Validar Suplidor
          const supplier = rawSupplier || 'Externo';

          // 4. Validar Fechas
          const startDate = rawStart || new Date().toISOString().split('T')[0];
          const endDate = rawEnd || startDate;
          if (new Date(startDate) > new Date(endDate)) {
            invalidRows.push({ row: i + 1, data: row, reason: `La fecha de inicio (${startDate}) no puede ser posterior a la fecha de fin (${endDate}).` });
            continue;
          }

          // 5. Validar Horas
          const totalHours = !isNaN(rawHours) && rawHours > 0 ? rawHours : 1;

          // 6. Normalizaciones
          const programCategory = normalizeProgramCategory(rawProg);
          const subprogram = normalizeSubprogram(programCategory, rawSubProg);
          const sessionType = normalizeSessionType(rawSession);
          const trainingType = normalizeTrainingType(rawType);
          const trainingFormat = normalizeTrainingFormat(rawFormat);
          const modality = normalizeModality(rawModality);
          const academicStatus = normalizeAcademicStatus(rawStatus);

          validTrainings.push({
            participantCard: matchedPart.card,
            participantName: matchedPart.name,
            participantCedula: matchedPart.cedula,
            participantEmail: matchedPart.email,
            companyId: matchedPart.companyId || 'emp_kasino',
            title: rawTitle,
            supplier,
            programCategory,
            subprogram,
            sessionType,
            trainingType,
            trainingFormat,
            modality,
            startDate,
            endDate,
            totalHours,
            academicStatus,
            score: rawScore !== null && !isNaN(rawScore) ? rawScore : null,
            certificateNumber: rawCert || null,
            credentialUrl: rawUrl || null,
            description: rawDesc || '',
            registeredBy: 'Carga Masiva Excel'
          });
        }

        resolve({ validTrainings, invalidRows });
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo Excel.'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parsea texto tabulado / copiado desde portapapeles
 */
export const parseExternalTrainingsFromText = (
  rawText: string,
  participants: Participant[]
): { validTrainings: CreateExternalTrainingPayload[]; invalidRows: Array<{ line: number; reason: string }> } => {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return { validTrainings: [], invalidRows: [] };

  const pByCard = new Map<string, Participant>();
  const pByCedula = new Map<string, Participant>();
  const pByEmail = new Map<string, Participant>();

  participants.forEach(p => {
    if (p.card) pByCard.set(p.card.trim().toLowerCase(), p);
    if (p.cedula) {
      pByCedula.set(p.cedula.replace(/\D/g, ''), p);
      pByCedula.set(p.cedula.trim(), p);
    }
    if (p.email) pByEmail.set(p.email.trim().toLowerCase(), p);
  });

  const validTrainings: CreateExternalTrainingPayload[] = [];
  const invalidRows: Array<{ line: number; reason: string }> = [];

  const startIndex = lines[0].toLowerCase().includes('titulo') || lines[0].toLowerCase().includes('ident') || lines[0].toLowerCase().includes('cedula') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split('\t').map(p => p.trim());
    if (parts.length < 2) {
      invalidRows.push({ line: i + 1, reason: 'Formato insuficiente. Se espera al menos: Identificación y Título de capacitación separados por tabulación.' });
      continue;
    }

    const rawId = parts[0] || '';
    const rawTitle = parts[1] || '';
    const rawSupplier = parts[2] || 'Externo';
    const rawProg = parts[3] || 'Tecnología & Digital';
    const rawSubProg = parts[4] || '';
    const rawFormat = parts[5] || 'Curso';
    const rawStart = formatExcelDate(parts[6]);
    const rawEnd = formatExcelDate(parts[7]) || rawStart;
    const rawHours = parts[8] ? Number(parts[8]) : 1;
    const rawStatus = parts[9] || 'Aprobado';
    const rawScore = parts[10] ? Number(parts[10]) : null;
    const rawCert = parts[11] || '';
    const rawUrl = parts[12] || '';

    let matchedPart = pByCard.get(rawId.toLowerCase());
    if (!matchedPart) matchedPart = pByCedula.get(rawId.replace(/\D/g, '')) || pByCedula.get(rawId);
    if (!matchedPart) matchedPart = pByEmail.get(rawId.toLowerCase());

    if (!matchedPart) {
      invalidRows.push({ line: i + 1, reason: `No se encontró colaborador para "${rawId}".` });
      continue;
    }

    if (!rawTitle) {
      invalidRows.push({ line: i + 1, reason: 'El título de la capacitación es obligatorio.' });
      continue;
    }

    const startDate = rawStart || new Date().toISOString().split('T')[0];
    const endDate = rawEnd || startDate;
    const programCategory = normalizeProgramCategory(rawProg);
    const subprogram = normalizeSubprogram(programCategory, rawSubProg);

    validTrainings.push({
      participantCard: matchedPart.card,
      participantName: matchedPart.name,
      participantCedula: matchedPart.cedula,
      participantEmail: matchedPart.email,
      companyId: matchedPart.companyId || 'emp_kasino',
      title: rawTitle,
      supplier: rawSupplier || 'Externo',
      programCategory,
      subprogram,
      sessionType: 'Asincrónica',
      trainingType: 'Técnico',
      trainingFormat: normalizeTrainingFormat(rawFormat),
      modality: 'Virtual',
      startDate,
      endDate,
      totalHours: !isNaN(rawHours) && rawHours > 0 ? rawHours : 1,
      academicStatus: normalizeAcademicStatus(rawStatus),
      score: rawScore !== null && !isNaN(rawScore) ? rawScore : null,
      certificateNumber: rawCert || null,
      credentialUrl: rawUrl || null,
      description: '',
      registeredBy: 'Carga Masiva Portapapeles'
    });
  }

  return { validTrainings, invalidRows };
};

/**
 * Exporta el listado completo o filtrado de capacitaciones externas a Excel
 */
export const exportExternalTrainingsToExcel = (
  trainings: ExternalTraining[],
  participants: Participant[] = []
): void => {
  const pMap = new Map<string, Participant>();
  participants.forEach(p => pMap.set(p.card, p));

  const data = trainings.map((t, idx) => {
    const p = pMap.get(t.participantCard);
    const pName = p?.name || t.participantName || 'Colaborador';
    const pCedula = p?.cedula || t.participantCedula || 'N/A';
    const pDept = p?.department || t.participantDepartment || 'General';

    return {
      'No.': idx + 1,
      'Cédula': pCedula,
      'No. Tarjeta': t.participantCard,
      'Nombre del Colaborador': pName,
      'Departamento': pDept,
      'Título de la Capacitación': t.title,
      'Suplidor / Emisor': t.supplier,
      'Programa de Sustentabilidad': getProgramShortName(t.programCategory),
      'Programa Completo': getProgramLabel(t.programCategory),
      'Subprograma': t.subprogram,
      'Formato': t.trainingFormat,
      'Tipo de Sesión': t.sessionType,
      'Tipo de Entrenamiento': t.trainingType,
      'Modalidad': t.modality,
      'Fecha Inicio': formatDateShort(t.startDate),
      'Fecha Fin': formatDateShort(t.endDate),
      'Horas Acreditadas': Number(t.totalHours) || 0,
      'Estatus Académico': t.academicStatus === 'passed' ? 'Aprobado' : (t.academicStatus || 'Completado'),
      'Calificación': t.score !== null && t.score !== undefined ? t.score : 'N/A',
      'Folio / Certificado': t.certificateNumber || 'N/A',
      'URL Credencial': t.credentialUrl || 'N/A',
      'Registrado Por': t.registeredBy || 'Administrador',
      'Fecha Registro': t.createdAt ? formatDateShort(t.createdAt) : 'N/A'
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Capacitaciones_Externas');

  ws['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 14 },
    { wch: 30 },
    { wch: 22 },
    { wch: 38 },
    { wch: 28 },
    { wch: 25 },
    { wch: 40 },
    { wch: 25 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 35 },
    { wch: 22 },
    { wch: 16 }
  ];

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Historico_Capacitaciones_Externas_${today}.xlsx`);
};

/**
 * Exporta la matriz de asistencia diaria de una cohorte de la Academia Técnica a Excel (.xlsx)
 */
export const exportTechnicalAcademyAttendanceToExcel = (matrix: TechnicalCohortAttendanceMatrix): void => {
  const formatStatus = (status?: string) => {
    switch (status) {
      case 'present': return 'PRESENTE';
      case 'late': return 'TARDANZA';
      case 'absent': return 'AUSENTE';
      case 'excused': return 'EXCUSADO';
      default: return 'NO REGISTRADO';
    }
  };

  const rows = matrix.participants.map((p, idx) => {
    const rowObj: Record<string, any> = {
      'No.': idx + 1,
      'Carnet / Código': p.card,
      'Cédula': p.cedula ? formatCedula(p.cedula) : 'N/A',
      'Colaborador': p.name,
      'Correo Electrónico': p.email,
      'Departamento': p.department || 'N/A'
    };

    // Añadir columnas por cada día hábil
    matrix.sessionDates.forEach((date, dIdx) => {
      const att = p.attendanceByDate[date];
      rowObj[`Día ${dIdx + 1} (${date})`] = formatStatus(att?.status);
    });

    rowObj['Días Asistidos'] = p.attendedDays;
    rowObj['Total Días'] = p.totalDays;
    rowObj['% Asistencia'] = `${p.attendancePercentage}%`;
    rowObj['Horas Acreditadas'] = p.totalHoursEarned;
    rowObj['Calificación (0-100)'] = p.score !== null && p.score !== undefined ? `${p.score} pts` : 'Pendiente';
    rowObj['Estado Académico'] = p.academicStatus === 'passed' ? 'APROBADO' : (p.academicStatus === 'failed' ? 'REPROBADO' : (p.score !== null && p.score !== undefined ? (p.score >= 70 ? 'APROBADO' : 'REPROBADO') : (p.attendancePercentage >= 80 ? 'APROBADO' : 'PENDIENTE')));
    rowObj['Condición Académica'] = rowObj['Estado Académico'];
    rowObj['Observaciones'] = p.feedback || '';

    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Ficha de cohorte (resumen)
  const avgAttendance = matrix.participants.length > 0
    ? Math.round(matrix.participants.reduce((acc, p) => acc + p.attendancePercentage, 0) / matrix.participants.length)
    : 0;

  const summaryData = [
    { 'Parámetro': 'Curso Técnico', 'Valor': matrix.courseTitle },
    { 'Parámetro': 'Grupo Técnico Asignado', 'Valor': matrix.groupName || 'Sin Grupo Específico' },
    { 'Parámetro': 'Facilitador / Instructor', 'Valor': matrix.facilitatorName || 'No Asignado' },
    { 'Parámetro': 'Fecha de Inicio', 'Valor': matrix.startDate },
    { 'Parámetro': 'Fecha de Finalización', 'Valor': matrix.endDate },
    { 'Parámetro': 'Horas Diarias', 'Valor': `${matrix.dailyHours} hrs` },
    { 'Parámetro': 'Total de Días de Taller', 'Valor': matrix.sessionDates.length },
    { 'Parámetro': 'Total Técnicos Matriculados', 'Valor': matrix.participants.length },
    { 'Parámetro': 'Promedio General de Asistencia', 'Valor': `${avgAttendance}%` },
    { 'Parámetro': 'PIN de Auto-marcado Diario', 'Valor': matrix.dailyPin }
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Matriz_Asistencia');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ficha_Cohorte');

  const cleanCourse = (matrix.courseTitle || 'Curso_Tecnico').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
  const cleanGroup = (matrix.groupName || 'Grupo').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 15);
  XLSX.writeFile(wb, `Academia_Tecnica_${cleanCourse}_${cleanGroup}_${matrix.startDate}.xlsx`);
};

/**
 * Exporta el listado de participantes matriculados en una cohorte técnica a Excel
 */
export const exportCohortParticipantsToExcel = (
  cohort: {
    id: string;
    courseTitle?: string;
    groupName?: string;
    facilitatorName?: string;
    startDate: string;
    endDate: string;
    dailyTime?: string;
    location?: string;
    capacity?: number;
    dailyHours?: number;
  },
  participants: TechnicalCohortEnrolledParticipant[]
): void => {
  const rows = participants.map((p, idx) => ({
    'No.': idx + 1,
    'Carnet / Tarjeta': p.card,
    'Cédula': p.cedula ? formatCedula(p.cedula) : 'N/A',
    'Nombre Completo': p.name,
    'Correo Electrónico': p.email,
    'Departamento / Área': p.department || 'N/A',
    'Estado Matrícula': p.enrollmentStatus === 'enrolled' ? 'MATRICULADO' : p.enrollmentStatus.toUpperCase(),
    'Fecha Matrícula': p.enrolledAt ? formatDateShort(p.enrolledAt) : 'N/A',
    'Días Asistidos': p.attendedDays ?? 0,
    'Total Días Taller': p.totalDays ?? 0,
    '% Asistencia': `${p.attendancePercentage ?? 0}%`,
    'Horas Acreditadas': p.totalHoursEarned ?? 0,
    'Calificación (0-100)': p.score !== null && p.score !== undefined ? `${p.score} pts` : 'Pendiente',
    'Estado Académico': p.academicStatus === 'passed' ? 'APROBADO' : (p.academicStatus === 'failed' ? 'REPROBADO' : (p.score !== null && p.score !== undefined ? (p.score >= 70 ? 'APROBADO' : 'REPROBADO') : 'PENDIENTE')),
    'Condición Académica': p.academicCondition || ((p.score !== null && p.score !== undefined ? (p.score >= 70 ? 'APROBADO' : 'REPROBADO') : (p.attendancePercentage ?? 0) >= 80 ? 'APROBADO' : (p.attendancePercentage ?? 0) >= 50 ? 'EN RIESGO' : 'REPROBADO')),
    'Retroalimentación': p.feedback || '',
    'Evaluado Por': p.gradedBy || '',
    'Fecha Calificación': p.gradedAt ? formatDateShort(p.gradedAt) : ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 6 },  // No.
    { wch: 16 }, // Carnet
    { wch: 18 }, // Cédula
    { wch: 32 }, // Nombre
    { wch: 30 }, // Correo
    { wch: 24 }, // Departamento
    { wch: 18 }, // Estado Matrícula
    { wch: 16 }, // Fecha Matrícula
    { wch: 15 }, // Días Asistidos
    { wch: 16 }, // Total Días
    { wch: 14 }, // % Asistencia
    { wch: 18 }, // Horas Acreditadas
    { wch: 20 }, // Calificación
    { wch: 18 }, // Estado Académico
    { wch: 20 }, // Condición Académica
    { wch: 30 }, // Retroalimentación
    { wch: 22 }, // Evaluado Por
    { wch: 18 }  // Fecha Calificación
  ];

  // Ficha de cohorte
  const summaryData = [
    { 'Parámetro': 'Curso Técnico', 'Valor': cohort.courseTitle || 'Curso Técnico' },
    { 'Parámetro': 'Grupo Técnico', 'Valor': cohort.groupName || 'Sin Grupo Asignado' },
    { 'Parámetro': 'Facilitador / Instructor', 'Valor': cohort.facilitatorName || 'No Asignado' },
    { 'Parámetro': 'Fecha de Inicio', 'Valor': cohort.startDate },
    { 'Parámetro': 'Fecha de Finalización', 'Valor': cohort.endDate },
    { 'Parámetro': 'Horario Diario', 'Valor': cohort.dailyTime || '08:00 AM - 12:00 PM' },
    { 'Parámetro': 'Ubicación / Laboratorio', 'Valor': cohort.location || 'Laboratorio Técnico' },
    { 'Parámetro': 'Cupo Máximo (Capacidad)', 'Valor': cohort.capacity || 20 },
    { 'Parámetro': 'Participantes Matriculados', 'Valor': participants.length },
    { 'Parámetro': 'Fecha de Emisión de Reporte', 'Valor': new Date().toISOString().slice(0, 10) }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Participantes_Matriculados');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ficha_Cohorte');

  const cleanCourse = (cohort.courseTitle || 'Academia_Tecnica').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
  const cleanDate = (cohort.startDate || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, '');
  XLSX.writeFile(wb, `Participantes_${cleanCourse}_${cleanDate}.xlsx`);
};

/**
 * Descarga una plantilla oficial para la carga masiva de participantes a una cohorte técnica
 */
export const downloadCohortParticipantsTemplateExcel = (): void => {
  const sampleData = [
    {
      'Carnet': '2010',
      'Cedula': '402-2196163-1',
      'Email': 'luis.almazan@empresa.com',
      'Nombre (Opcional)': 'LUIS ALBERTO ALMAZAN POOT',
      'Calificacion (0-100 Opcional)': 95
    },
    {
      'Carnet': '2012',
      'Cedula': '001-0876543-2',
      'Email': 'liliana.sosa@empresa.com',
      'Nombre (Opcional)': 'LILIANA ESTHER SOSA PECH',
      'Calificacion (0-100 Opcional)': 88
    },
    {
      'Carnet': '1998',
      'Cedula': '001-1234567-8',
      'Email': 'fermin.chi@empresa.com',
      'Nombre (Opcional)': 'FERMIN GABRIEL CHI PERERA',
      'Calificacion (0-100 Opcional)': ''
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [
    { wch: 16 }, // Carnet
    { wch: 18 }, // Cedula
    { wch: 30 }, // Email
    { wch: 35 }, // Nombre
    { wch: 28 }  // Calificacion
  ];

  const instructions = [
    { 'Paso / Regla': '1. Identificación', 'Detalle': 'El sistema puede vincular al técnico por su Carnet (Tarjeta), Cédula o Correo Electrónico institucional.' },
    { 'Paso / Regla': '2. Flexibilidad', 'Detalle': 'Basta con completar al menos una de las columnas de identificación (Carnet, Cédula o Email) por cada fila.' },
    { 'Paso / Regla': '3. Calificación (Opcional)', 'Detalle': 'Puede incluir la columna "Calificación" o "Nota" con un valor numérico entre 0 y 100.' },
    { 'Paso / Regla': '4. Validación', 'Detalle': 'El colaborador debe estar previamente registrado en el padrón general de la plataforma.' },
    { 'Paso / Regla': '5. Formatos admitidos', 'Detalle': 'Puede subir este archivo en formato .xlsx, .xls o guardar como .csv.' }
  ];
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 24 }, { wch: 70 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  XLSX.writeFile(wb, 'Plantilla_Carga_Participantes_Academia_Tecnica.xlsx');
};

/**
 * Procesa y valida un archivo Excel/CSV con la lista de participantes a enrolar
 */
export const parseCohortParticipantsExcel = async (
  file: File,
  allParticipants: Participant[]
): Promise<{
  matched: Array<{
    card: string;
    name: string;
    email: string;
    cedula?: string;
    department?: string;
    score?: number;
    matchedBy: 'card' | 'cedula' | 'email';
  }>;
  unmatched: Array<{
    rawValue: string;
    reason: string;
    rowNumber: number;
  }>;
  duplicatesInFile: number;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rows || rows.length < 2) {
          throw new Error('El archivo no contiene filas de datos para procesar.');
        }

        const header = (rows[0] || []).map((h: any) => String(h || '').toLowerCase().trim());
        let cardIdx = header.findIndex((h: string) => h.includes('carnet') || h.includes('tarjeta') || h.includes('card') || h.includes('codigo') || h.includes('código'));
        let cedulaIdx = header.findIndex((h: string) => h.includes('cedula') || h.includes('cédula'));
        let emailIdx = header.findIndex((h: string) => h.includes('correo') || h.includes('email') || h.includes('mail'));
        let scoreIdx = header.findIndex((h: string) => h.includes('nota') || h.includes('calificacion') || h.includes('calificación') || h.includes('score') || h.includes('puntos'));

        // Si la primera columna no tiene cabecera estándar pero es la primera
        if (cardIdx === -1 && cedulaIdx === -1 && emailIdx === -1) {
          cardIdx = 0;
        }

        // Mapeos rápidos para búsqueda O(1)
        const byCard = new Map<string, Participant>();
        const byCedula = new Map<string, Participant>();
        const byEmail = new Map<string, Participant>();

        allParticipants.forEach(p => {
          if (p.card) byCard.set(p.card.trim().toLowerCase(), p);
          if (p.cedula) {
            const clean = p.cedula.replace(/[^0-9kK]/g, '').toLowerCase();
            if (clean) byCedula.set(clean, p);
          }
          if (p.email) byEmail.set(p.email.trim().toLowerCase(), p);
        });

        const matched: Array<{
          card: string;
          name: string;
          email: string;
          cedula?: string;
          department?: string;
          score?: number;
          matchedBy: 'card' | 'cedula' | 'email';
        }> = [];
        const unmatched: Array<{ rawValue: string; reason: string; rowNumber: number }> = [];
        const seenCards = new Set<string>();
        let duplicatesInFile = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawCard = cardIdx !== -1 ? String(row[cardIdx] || '').trim() : '';
          const rawCedula = cedulaIdx !== -1 ? String(row[cedulaIdx] || '').trim() : '';
          const rawEmail = emailIdx !== -1 ? String(row[emailIdx] || '').trim() : '';

          if (!rawCard && !rawCedula && !rawEmail) {
            continue;
          }

          let found: Participant | undefined;
          let matchedBy: 'card' | 'cedula' | 'email' = 'card';

          // 1. Intentar por carnet
          if (rawCard && byCard.has(rawCard.toLowerCase())) {
            found = byCard.get(rawCard.toLowerCase());
            matchedBy = 'card';
          }
          // 2. Intentar por cédula
          if (!found && rawCedula) {
            const cleanCedula = rawCedula.replace(/[^0-9kK]/g, '').toLowerCase();
            if (byCedula.has(cleanCedula)) {
              found = byCedula.get(cleanCedula);
              matchedBy = 'cedula';
            }
          }
          // 3. Intentar por email
          if (!found && rawEmail) {
            if (byEmail.has(rawEmail.toLowerCase())) {
              found = byEmail.get(rawEmail.toLowerCase());
              matchedBy = 'email';
            }
          }
          // 4. Si rawCard contiene formato de email
          if (!found && rawCard.includes('@') && byEmail.has(rawCard.toLowerCase())) {
            found = byEmail.get(rawCard.toLowerCase());
            matchedBy = 'email';
          }

          const identifierDisplay = rawCard || rawCedula || rawEmail;

          // Extraer nota si vino en el archivo
          let rowScore: number | undefined = undefined;
          if (scoreIdx !== -1 && row[scoreIdx] !== undefined && row[scoreIdx] !== null && String(row[scoreIdx]).trim() !== '') {
            const parsedNum = parseFloat(String(row[scoreIdx]).replace(',', '.').trim());
            if (!isNaN(parsedNum) && parsedNum >= 0 && parsedNum <= 100) {
              rowScore = Math.round(parsedNum * 100) / 100;
            }
          }

          if (found) {
            if (seenCards.has(found.card)) {
              duplicatesInFile++;
            } else {
              seenCards.add(found.card);
              matched.push({
                card: found.card,
                name: found.name,
                email: found.email,
                cedula: found.cedula,
                department: found.department,
                score: rowScore,
                matchedBy
              });
            }
          } else {
            unmatched.push({
              rawValue: identifierDisplay,
              reason: 'No se encontró colaborador en el padrón con este identificador.',
              rowNumber: i + 1
            });
          }
        }

        resolve({ matched, unmatched, duplicatesInFile });
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsArrayBuffer(file);
  });
};

