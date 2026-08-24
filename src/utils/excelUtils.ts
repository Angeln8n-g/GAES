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
  Company
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

/**
 * Exporta el Libro de Calificaciones de un evento específico
 */
export const exportEventGradesToExcel = (
  event: TrainingEvent,
  participants: Participant[]
): void => {
  const grades = event.grades || [];
  const data = grades.map((g, idx) => {
    const p = participants.find(part => part.card === g.participantCard || part.email.toLowerCase() === g.participantEmail?.toLowerCase());
    return {
      'No.': idx + 1,
      'Cédula': p?.cedula || 'N/A',
      'No. Tarjeta': g.participantCard,
      'Nombre del Colaborador': g.participantName || p?.name || 'N/A',
      'Correo Electrónico': g.participantEmail || p?.email || 'N/A',
      'Departamento': g.participantDepartment || p?.department || 'General',
      'Capacitación': event.title,
      'Categoría': event.category,
      'Tipo de Evaluación': event.evaluationType === 'score_100' ? 'Numérica (0-100)' : event.evaluationType === 'scale_1_5' ? 'Escala (1-5)' : 'Aprobado/Reprobado',
      'Calificación Obtenida': g.score !== null && g.score !== undefined ? `${g.score} pts` : 'No asignada',
      'Estado Académico': g.academicStatus === 'passed' ? 'APROBADO' : g.academicStatus === 'failed' ? 'REPROBADO' : 'PENDIENTE',
      'Debilidades / Brechas Detectadas': (g.detectedSkillGaps || []).join(', ') || 'Ninguna',
      'Notas de Debilidad': g.weaknessesNotes || '',
      'Fortalezas Observadas': g.strengthsNotes || '',
      'Requiere Re-capacitación': g.needsRetraining ? 'SÍ' : 'NO',
      'Recomendaciones del Docente': g.feedback || '',
      'Evaluado Por': g.gradedBy || 'Instructor',
      'Fecha de Calificación': g.gradedAt || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');

  ws['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 15 },
    { wch: 30 },
    { wch: 30 },
    { wch: 20 },
    { wch: 35 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 35 },
    { wch: 35 },
    { wch: 35 },
    { wch: 22 },
    { wch: 40 },
    { wch: 25 },
    { wch: 20 }
  ];

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


