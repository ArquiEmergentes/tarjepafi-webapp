// Genera server/db.json con datos simulados y coherentes entre sí para el Sprint 1.
// Ejecuta: npm run api:seed   (sobrescribe server/db.json)
// Todas las fechas son hora local del campus (Lima), en ISO 8601 sin zona: YYYY-MM-DDTHH:mm:ss.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'db.json');

// ---------- utilidades deterministas ----------
let seed = 20262;
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pad = (n, l = 2) => String(n).padStart(l, '0');

/** Fecha del 5 al 10 de octubre de 2026 (día del mes) + hora "HH:mm" + minutos/segundos extra. */
function at(day, hhmm, addMin = 0, addSec = 0) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(Date.UTC(2026, 9, day, h, m, 0) + addMin * 60000 + addSec * 1000);
  return fmt(d);
}
function fmt(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
const ms = (iso) => Date.parse(iso + 'Z');
const minutesBetween = (a, b) => Math.round((ms(b) - ms(a)) / 60000);
const NOW = '2026-10-07T09:50:00'; // hora simulada inicial (miércoles)
const before = (iso) => ms(iso) < ms(NOW);

let counter = 0;
const nextId = (prefix) => `${prefix}-${pad(++counter, 5)}`;
const hex = () => pad(between(0, 255).toString(16).toUpperCase());
const usedUids = new Set();
function cardUid() {
  let uid;
  do { uid = ['04', hex(), hex(), hex(), hex()].join(':'); } while (usedUids.has(uid));
  usedUids.add(uid);
  return uid;
}

// ---------- settings ----------
const settings = { term: '2026-2', enrollmentDeadline: '2026-10-03T23:59:59', defaultToleranceMinutes: 10 };

// ---------- espacios ----------
const ALL = ['STUDENT', 'TEACHER', 'STAFF'];
const spaces = [
  ['sp-ent-01', 'ENT-01', 'Entrada principal', 'CAMPUS_ENTRANCE', 'Pabellón A', 1, 600, 'AVAILABLE', 'OPEN', ALL],
  ['sp-sal-01', 'SAL-01', 'Salida principal', 'CAMPUS_EXIT', 'Pabellón A', 1, 600, 'AVAILABLE', 'OPEN', ALL],
  ['sp-a301', 'A-301', 'Aula A-301', 'CLASSROOM', 'Pabellón A', 3, 40, 'AVAILABLE', 'OPEN', ['STUDENT', 'TEACHER']],
  ['sp-a302', 'A-302', 'Aula A-302', 'CLASSROOM', 'Pabellón A', 3, 40, 'AVAILABLE', 'OPEN', ['STUDENT', 'TEACHER']],
  ['sp-a303', 'A-303', 'Aula A-303', 'CLASSROOM', 'Pabellón A', 3, 35, 'AVAILABLE', 'OPEN', ['STUDENT', 'TEACHER']],
  ['sp-b201', 'B-201', 'Aula B-201', 'CLASSROOM', 'Pabellón B', 2, 45, 'AVAILABLE', 'OPEN', ['STUDENT', 'TEACHER']],
  ['sp-b202', 'B-202', 'Aula B-202', 'CLASSROOM', 'Pabellón B', 2, 45, 'AVAILABLE', 'OPEN', ['STUDENT', 'TEACHER']],
  ['sp-c105', 'C-105', 'Aula C-105', 'CLASSROOM', 'Pabellón C', 1, 30, 'AVAILABLE', 'OPEN', ['STUDENT', 'TEACHER']],
  ['sp-lab-c', 'LAB-C201', 'Laboratorio de Cómputo C-201', 'LABORATORY', 'Pabellón C', 2, 30, 'AVAILABLE', 'OPEN', ALL],
  ['sp-lab-e', 'LAB-E104', 'Laboratorio de Electrónica E-104', 'LABORATORY', 'Pabellón E', 1, 24, 'AVAILABLE', 'RESTRICTED', ['TEACHER', 'STAFF']],
  ['sp-srv', 'SRV-101', 'Sala de Servidores', 'RESTRICTED_AREA', 'Pabellón D', 1, 6, 'AVAILABLE', 'RESTRICTED', ['STAFF']],
  ['sp-arc', 'ARC-201', 'Archivo Académico', 'RESTRICTED_AREA', 'Pabellón D', 2, 8, 'MAINTENANCE', 'RESTRICTED', ['STAFF']],
  ['sp-sdoc', 'SDOC-301', 'Sala de Docentes', 'MEETING_ROOM', 'Pabellón B', 3, 30, 'AVAILABLE', 'RESTRICTED', ['TEACHER', 'STAFF']],
  ['sp-bib', 'BIB-01', 'Biblioteca Central', 'LIBRARY', 'Pabellón E', 1, 250, 'AVAILABLE', 'OPEN', ALL],
  ['sp-cub-l1', 'CUB-L01', 'Cubículo de estudio L-01', 'STUDY_CUBICLE', 'Pabellón E', 2, 4, 'AVAILABLE', 'OPEN', ['STUDENT']],
].map(([id, code, name, type, building, floor, capacity, status, accessPolicy, allowedRoles]) =>
  ({ id, code, name, type, building, floor, capacity, status, accessPolicy, allowedRoles }));
const spaceById = Object.fromEntries(spaces.map((s) => [s.id, s]));

// ---------- titulares ----------
const FIRST = ['Valeria', 'Diego', 'Camila', 'Mateo', 'Sofía', 'Sebastián', 'Lucía', 'Thiago', 'Daniela', 'Adrián',
  'Mariana', 'Joaquín', 'Fernanda', 'Gabriel', 'Isabella', 'Nicolás', 'Andrea', 'Rodrigo', 'Paula', 'Emilio'];
const LAST = ['García', 'Rojas', 'Flores', 'Chávez', 'Vargas', 'Ramírez', 'Castillo', 'Huamán', 'Mendoza', 'Torres',
  'Salazar', 'Quispe', 'Gutiérrez', 'Morales', 'Espinoza', 'Paredes', 'Cárdenas', 'Ríos', 'Aguilar', 'Herrera'];
const PROGRAMS = ['Ingeniería de Software', 'Ciencias de la Computación', 'Ingeniería de Sistemas de Información'];

const cardHolders = [];
const students = [];
const PENDING_IDX = new Set([5, 11, 17, 23, 29, 35]);
for (let i = 0; i < 40; i++) {
  const code = i === 0 ? 'U202312966' : `U${i < 20 ? 2023 : 2024}${pad(10000 + i * 137, 5)}`;
  const fullName = i === 0 ? 'Javier Gonzales Paredes' : `${FIRST[i % 20]} ${LAST[(i * 7) % 20]} ${LAST[(i * 3 + 5) % 20]}`;
  const ch = {
    id: `ch-${code.toLowerCase()}`, code, fullName, email: `${code.toLowerCase()}@upc.edu.pe`, role: 'STUDENT',
    program: PROGRAMS[i % 3], enrollmentStatus: PENDING_IDX.has(i) ? 'PENDING' : 'COMPLETED',
  };
  cardHolders.push(ch); students.push(ch);
}
const teachers = [
  ['D0001', 'Carlos Mendoza Ríos', 'docente@upc.edu.pe'],
  ['D0002', 'Lucía Paredes Vega', 'lparedes@upc.edu.pe'],
  ['D0003', 'Jorge Salazar Núñez', 'jsalazar@upc.edu.pe'],
  ['D0004', 'Ana Quispe Torres', 'aquispe@upc.edu.pe'],
].map(([code, fullName, email]) => ({
  id: `ch-${code.toLowerCase()}`, code, fullName, email, role: 'TEACHER', program: 'Facultad de Ingeniería', enrollmentStatus: null,
}));
const staff = [
  ['T0001', 'Rosa Huamán Ccori', 'Seguridad'], ['T0002', 'Pedro Lázaro Inga', 'Seguridad'],
  ['T0003', 'Marco Villanueva Soto', 'Mantenimiento'], ['T0004', 'Elena Cusi Mamani', 'Limpieza'],
  ['T0005', 'Luis Tapia Ramos', 'Soporte TI'], ['T0006', 'Carmen Ruiz Palomino', 'Cafetería'],
  ['T0007', 'Héctor Ñique Puma', 'Mantenimiento'], ['T0008', 'Gloria Sánchez Atoche', 'Limpieza'],
].map(([code, fullName, area]) => ({
  id: `ch-${code.toLowerCase()}`, code, fullName, email: `${code.toLowerCase()}@upc.edu.pe`, role: 'STAFF', program: area, enrollmentStatus: null,
}));
cardHolders.push(...teachers, ...staff);

// ---------- usuarios ----------
const users = [
  ['usr-001', 'admin@upc.edu.pe', 'Admin123*', 'ADMIN', 'ACTIVE', null, 'María Torres'],
  ['usr-002', 'docente@upc.edu.pe', 'Docente123*', 'TEACHER', 'ACTIVE', teachers[0].id, teachers[0].fullName],
  ['usr-003', 'u202312966@upc.edu.pe', 'User123*', 'STUDENT', 'ACTIVE', students[0].id, students[0].fullName],
  ['usr-004', 'trabajador@upc.edu.pe', 'User123*', 'STAFF', 'ACTIVE', staff[0].id, staff[0].fullName],
  ['usr-005', 'lparedes@upc.edu.pe', 'Docente123*', 'TEACHER', 'ACTIVE', teachers[1].id, teachers[1].fullName],
  ['usr-006', 'jsalazar@upc.edu.pe', 'Docente123*', 'TEACHER', 'INACTIVE', teachers[2].id, teachers[2].fullName],
  ['usr-007', 'soporte@upc.edu.pe', 'Admin123*', 'ADMIN', 'SUSPENDED', null, 'Equipo de Soporte'],
].map(([id, email, password, role, status, cardHolderId, fullName]) => ({
  id, email, password, role, status, cardHolderId, fullName, createdAt: '2026-08-17T08:00:00', updatedAt: '2026-08-17T08:00:00',
}));

// ---------- credenciales ----------
const credentials = [];
const credentialStatusHistory = [];
const dataRecords = [];
function addData(sourceContext, dataType, subjectId, occurredAt, payload, eventId = null) {
  dataRecords.push({ id: nextId('dr'), eventId: eventId ?? nextId('evt'), sourceContext, dataType, subjectId, occurredAt, recordedAt: occurredAt, payload });
}
function issue(holderId, status = 'ACTIVE', issuedAt = '2026-08-17T09:00:00') {
  const c = { id: `cred-${pad(credentials.length + 1, 3)}`, cardUid: cardUid(), cardHolderId: holderId, status, issuedAt, statusChangedAt: issuedAt, lastUsedAt: null };
  credentials.push(c);
  return c;
}
function changeStatus(cred, toStatus, reason, changedBy, changedAt) {
  credentialStatusHistory.push({ id: nextId('csh'), credentialId: cred.id, fromStatus: cred.status, toStatus, reason, changedBy, changedAt });
  addData('CREDENTIALS', 'CREDENTIAL_CHANGE', cred.id, changedAt, { fromStatus: cred.status, toStatus, reason });
  cred.status = toStatus; cred.statusChangedAt = changedAt;
}
const credByHolder = {};
for (const h of cardHolders) credByHolder[h.id] = issue(h.id);
// Escenarios de estado
changeStatus(credByHolder[students[14].id], 'BLOCKED', 'MANUAL', 'usr-001', '2026-10-02T11:20:00');
changeStatus(credByHolder[staff[3].id], 'BLOCKED', 'MANUAL', 'usr-001', '2026-10-05T16:05:00');
changeStatus(credByHolder[students[20].id], 'LOST', 'LOST', 'usr-001', '2026-10-01T09:40:00');
changeStatus(credByHolder[students[8].id], 'LOST', 'LOST', 'usr-001', '2026-09-28T10:15:00');
credByHolder[students[8].id] = issue(students[8].id, 'ACTIVE', '2026-09-29T08:30:00'); // reposición
changeStatus(credByHolder[students[38].id], 'DEACTIVATED', 'WITHDRAWAL', 'usr-001', '2026-09-30T15:00:00');
changeStatus(credByHolder[students[23].id], 'DEACTIVATED', 'ENROLLMENT_NOT_COMPLETED', 'SYSTEM', '2026-08-20T00:00:00');
changeStatus(credByHolder[staff[7].id], 'DEACTIVATED', 'MANUAL', 'usr-001', '2026-09-15T12:00:00');
issue(null, 'ACTIVE', '2026-10-01T10:00:00'); // tarjetas en stock sin vincular
issue(null, 'ACTIVE', '2026-10-01T10:00:00');
const credentialPermissions = [
  { id: 'perm-001', credentialId: credByHolder[students[0].id].id, spaceId: 'sp-lab-e', effect: 'ALLOW' },
  { id: 'perm-002', credentialId: credByHolder[staff[2].id].id, spaceId: 'sp-srv', effect: 'DENY' },
];

// ---------- académico ----------
const courses = [
  ['crs-01', '1ASI0728', 'Aplicaciones Web', 'Desarrollo de Software'],
  ['crs-02', '1ASI0572', 'Arquitectura de Software', 'Ingeniería de Software'],
  ['crs-03', '1ACC0216', 'Bases de Datos', 'Ciencias de la Computación'],
  ['crs-04', '1ASI0398', 'Internet de las Cosas', 'Sistemas Embebidos'],
  ['crs-05', '1MAT0105', 'Estadística Aplicada', 'Matemáticas'],
  ['crs-06', '1HUM0302', 'Ética Profesional', 'Humanidades'],
].map(([id, code, name, subject]) => ({ id, code, name, subject }));
// [courseId, section, teacherIdx, spaceId, dayOfWeek (1=lun), start, end]
const SCHEDULES = [
  ['crs-01', 'SW51', 0, 'sp-a301', 1, '10:00', '11:30'], ['crs-01', 'SW51', 0, 'sp-a301', 3, '10:00', '11:30'],
  ['crs-02', 'SW52', 0, 'sp-a302', 2, '14:00', '15:30'], ['crs-02', 'SW52', 0, 'sp-a302', 4, '14:00', '15:30'],
  ['crs-03', 'CC41', 1, 'sp-b201', 1, '08:00', '09:30'], ['crs-03', 'CC41', 1, 'sp-b201', 3, '08:00', '09:30'],
  ['crs-04', 'SE31', 1, 'sp-b202', 2, '10:00', '11:30'], ['crs-04', 'SE31', 1, 'sp-b202', 5, '10:00', '11:30'],
  ['crs-05', 'MA21', 2, 'sp-a303', 3, '13:00', '14:30'], ['crs-05', 'MA21', 2, 'sp-a303', 5, '13:00', '14:30'],
  ['crs-06', 'HU11', 3, 'sp-c105', 4, '08:00', '09:30'], ['crs-06', 'HU11', 3, 'sp-c105', 6, '09:00', '10:30'],
];
const classSchedules = SCHEDULES.map(([courseId, section, t, spaceId, dayOfWeek, startTime, endTime], i) => ({
  id: `sch-${pad(i + 1)}`, courseId, section, teacherId: teachers[t].id, spaceId, dayOfWeek, startTime, endTime, term: settings.term,
}));
const enrollments = [];
students.forEach((s, i) => {
  const picks = [i % 6, (i + 1) % 6, (i + 3) % 6].map((n) => courses[n].id);
  for (const sch of classSchedules.filter((c) => picks.includes(c.courseId))) {
    enrollments.push({ id: nextId('enr'), studentId: s.id, scheduleId: sch.id, term: settings.term, status: i === 38 ? 'WITHDRAWN' : 'ACTIVE' });
  }
});

// ---------- lectores ----------
const READERS = [
  ['RDR-A-301', 'Lector Aula A-301', 'CLASSROOM_READER', 'sp-a301', 'ACTIVE'],
  ['RDR-A-302', 'Lector Aula A-302', 'CLASSROOM_READER', 'sp-a302', 'ACTIVE'],
  ['RDR-A-303', 'Lector Aula A-303', 'CLASSROOM_READER', 'sp-a303', 'ACTIVE'],
  ['RDR-B-201', 'Lector Aula B-201', 'CLASSROOM_READER', 'sp-b201', 'ACTIVE'],
  ['RDR-B-202', 'Lector Aula B-202', 'CLASSROOM_READER', 'sp-b202', 'DEGRADED'],
  ['RDR-C-105', 'Lector Aula C-105', 'CLASSROOM_READER', 'sp-c105', 'ACTIVE'],
  ['RDR-C-107', 'Lector Aula C-105 · puerta posterior', 'CLASSROOM_READER', 'sp-c105', 'OFFLINE'],
  ['RDR-T-001', 'Torniquete Entrada 1', 'TURNSTILE', 'sp-ent-01', 'ACTIVE'],
  ['RDR-T-002', 'Torniquete Entrada 2', 'TURNSTILE', 'sp-ent-01', 'ACTIVE'],
  ['RDR-T-003', 'Torniquete Salida 1', 'TURNSTILE', 'sp-sal-01', 'ACTIVE'],
  ['RDR-T-004', 'Torniquete Salida 2', 'TURNSTILE', 'sp-sal-01', 'ACTIVE'],
  ['RDR-D-001', 'Puerta Laboratorio de Cómputo', 'DOOR_READER', 'sp-lab-c', 'ACTIVE'],
  ['RDR-D-002', 'Puerta Laboratorio de Electrónica', 'DOOR_READER', 'sp-lab-e', 'ACTIVE'],
  ['RDR-D-003', 'Puerta Sala de Servidores', 'DOOR_READER', 'sp-srv', 'ACTIVE'],
  ['RDR-D-004', 'Puerta Archivo Académico', 'DOOR_READER', 'sp-arc', 'ACTIVE'],
  ['RDR-D-005', 'Puerta Sala de Docentes', 'DOOR_READER', 'sp-sdoc', 'ACTIVE'],
  ['RDR-D-006', 'Puerta Biblioteca Central', 'DOOR_READER', 'sp-bib', 'DEGRADED'],
  ['RDR-D-007', 'Puerta Cubículo L-01', 'DOOR_READER', 'sp-cub-l1', 'MAINTENANCE'],
  ['RDR-K-001', 'Lector de mostrador Biblioteca', 'DESK_READER', 'sp-bib', 'REGISTERED'],
  ['RDR-K-002', 'Lector de mostrador Sala de Docentes', 'DESK_READER', 'sp-sdoc', 'INACTIVE'],
];
const readers = READERS.map(([id, name, deviceType, spaceId, status]) => ({
  id, name, deviceType, spaceId, status,
  configuration: {
    readerMode: deviceType === 'CLASSROOM_READER' ? 'ATTENDANCE' : 'ACCESS_CONTROL',
    communicationInterval: 30, heartbeatInterval: 60, firmwareVersion: status === 'DEGRADED' ? '2.3.8' : '2.4.1',
  },
  registeredAt: status === 'REGISTERED' ? '2026-10-06T15:30:00' : '2026-08-10T09:00:00',
  lastSeenAt: { REGISTERED: null, INACTIVE: '2026-10-02T18:00:00', OFFLINE: '2026-10-06T21:12:00', MAINTENANCE: '2026-10-05T12:40:00' }[status] ?? '2026-10-07T09:49:30',
}));
// RDR-T-004 dejó de comunicarse hace 10 min: la primera evaluación de conectividad lo marcará OFFLINE.
readers.find((r) => r.id === 'RDR-T-004').lastSeenAt = '2026-10-07T09:40:00';
const readerById = Object.fromEntries(readers.map((r) => [r.id, r]));

const telemetry = [];
for (const r of readers.filter((x) => x.status !== 'REGISTERED')) {
  const last = r.lastSeenAt;
  for (let k = 5; k >= 0; k--) {
    const capturedAt = fmt(new Date(ms(last) - k * 3600000));
    const weak = r.status === 'DEGRADED' || r.status === 'OFFLINE';
    telemetry.push({
      id: nextId('tel'), readerId: r.id, capturedAt,
      signalStrength: weak ? -between(76, 88) : -between(42, 64),
      uptime: Math.max(0, Math.round((ms(capturedAt) - ms('2026-10-05T06:00:00')) / 1000)),
      firmwareVersion: r.configuration.firmwareVersion,
      status: r.status === 'OFFLINE' && k === 0 ? 'OFFLINE' : weak ? 'DEGRADED' : 'ACTIVE',
    });
  }
}
const incidents = [
  ['RDR-C-107', 'DEVICE_OFFLINE', '2026-10-06T21:15:00', 'El lector dejó de enviar heartbeats.', null],
  ['RDR-B-202', 'READ_ERROR', '2026-10-07T08:12:00', 'Lecturas fallidas intermitentes: 7 de 50 en la última hora.', null],
  ['RDR-D-006', 'CONNECTIVITY_FAILURE', '2026-10-07T07:30:00', 'Latencia alta con el gateway del Pabellón E.', null],
  ['RDR-D-007', 'HARDWARE_FAILURE', '2026-10-05T12:45:00', 'Antena NFC dañada. Equipo en mantenimiento.', null],
  ['RDR-T-002', 'CONNECTIVITY_FAILURE', '2026-10-05T07:05:00', 'Pérdida de conexión durante 4 minutos.', '2026-10-05T07:09:00'],
  ['RDR-A-302', 'CONFIGURATION_ERROR', '2026-10-06T08:00:00', 'Intervalo de heartbeat menor al de comunicación.', '2026-10-06T08:20:00'],
].map(([readerId, type, detectedAt, description, resolvedAt]) => ({ id: nextId('inc'), readerId, type, detectedAt, description, resolvedAt }));
for (const inc of incidents) addData('IOT_MONITORING', 'DEVICE_TELEMETRY', inc.readerId, inc.detectedAt, { incidentType: inc.type, incidentId: inc.id });

// ---------- lecturas ----------
const cardTapEvents = [];
const accessRecords = [];
const attendanceRecords = [];
const workShifts = [];
const holderById = Object.fromEntries(cardHolders.map((h) => [h.id, h]));

function tap(readerId, cred, uid, tappedAt, outcome, displayMessage) {
  const ev = { id: nextId('evt'), readerId, cardUid: uid, tappedAt, outcome, displayMessage, source: 'SIMULATOR' };
  cardTapEvents.push(ev);
  if (cred) cred.lastUsedAt = tappedAt;
  addData('IOT_MONITORING', 'CARD_READING', readerId, tappedAt, { cardUid: uid, outcome }, ev.id);
  return ev;
}
function access(readerId, holder, tappedAt, accessType, decision, denialReason, uidOverride) {
  const cred = holder ? credByHolder[holder.id] : null;
  const uid = uidOverride ?? cred.cardUid;
  const msg = denialReason === 'CARD_NOT_REGISTERED' ? 'Tarjeta no registrada'
    : denialReason === 'CARD_INACTIVE' ? 'Tarjeta inactiva. Acércate a servicios universitarios'
      : decision === 'GRANTED' ? 'Acceso concedido' : 'Acceso denegado';
  const ev = tap(readerId, decision === 'GRANTED' ? cred : null, uid, tappedAt, decision === 'GRANTED' ? 'ACCESS' : 'REJECTED', msg);
  const rec = {
    id: nextId('acc'), tapEventId: ev.id, cardUid: uid, credentialId: cred && !uidOverride ? cred.id : null, cardHolderId: holder && !uidOverride ? holder.id : null,
    spaceId: readerById[readerId].spaceId, readerId, accessType, decision, denialReason, attemptedAt: tappedAt,
  };
  accessRecords.push(rec);
  addData('SPACE_AND_FACILITY', 'ACCESS', rec.id, tappedAt, { decision, denialReason, accessType, spaceId: rec.spaceId }, ev.id);
}
function attendance(rec, eventId) {
  attendanceRecords.push(rec);
  addData('ACADEMIC_ATTENDANCE', 'ATTENDANCE', rec.id, rec.checkInAt ?? rec.confirmedAt, { sessionId: rec.sessionId, role: rec.role, status: rec.status }, eventId);
}
const readerOfSpace = (spaceId) => readers.find((r) => r.spaceId === spaceId && r.deviceType === 'CLASSROOM_READER' && r.id !== 'RDR-C-107')?.id
  ?? readers.find((r) => r.spaceId === spaceId).id;
const fmtDuration = (min) => `${Math.floor(min / 60)} h ${pad(min % 60)} min`;

// Sesiones de la semana (lun 5 - sáb 10)
const sessions = [];
const sessionParticipants = [];
const NO_SHOW = 'sch-03'; // Arquitectura de Software, martes: el docente nunca llegó
for (const sch of classSchedules) {
  const day = 4 + sch.dayOfWeek;
  const course = courses.find((c) => c.id === sch.courseId);
  sessions.push({
    id: `ses-${sch.id.slice(4)}-${day}`, type: 'CLASS', scheduleId: sch.id, title: `${course.name} · ${sch.section}`, spaceId: sch.spaceId,
    date: at(day, '00:00').slice(0, 10), scheduledStart: at(day, sch.startTime), scheduledEnd: at(day, sch.endTime),
    toleranceMinutes: settings.defaultToleranceMinutes, status: 'SCHEDULED',
  });
}
sessions.push(
  { id: 'mtg-01', type: 'MEETING', scheduleId: null, title: 'Reunión de coordinación académica', spaceId: 'sp-sdoc', date: '2026-10-05', scheduledStart: '2026-10-05T17:00:00', scheduledEnd: '2026-10-05T18:00:00', toleranceMinutes: 10, status: 'SCHEDULED' },
  { id: 'mtg-02', type: 'MEETING', scheduleId: null, title: 'Capacitación: uso de lectores NFC en aula', spaceId: 'sp-sdoc', date: '2026-10-08', scheduledStart: '2026-10-08T16:00:00', scheduledEnd: '2026-10-08T17:30:00', toleranceMinutes: 10, status: 'SCHEDULED' },
);
for (const t of teachers.slice(0, 3)) sessionParticipants.push({ id: nextId('spt'), sessionId: 'mtg-01', cardHolderId: t.id });
for (const t of teachers) sessionParticipants.push({ id: nextId('spt'), sessionId: 'mtg-02', cardHolderId: t.id });

// Entradas al campus (una por titular y día con clases antes de la hora simulada)
const firstClassByHolderDay = {};
const noteFirst = (holderId, day, startIso) => {
  const k = `${holderId}|${day}`;
  if (!firstClassByHolderDay[k] || ms(startIso) < ms(firstClassByHolderDay[k])) firstClassByHolderDay[k] = startIso;
};
for (const s of sessions.filter((x) => x.type === 'CLASS')) {
  const sch = classSchedules.find((c) => c.id === s.scheduleId);
  const day = Number(s.date.slice(8));
  noteFirst(sch.teacherId, day, s.scheduledStart);
  for (const e of enrollments.filter((x) => x.scheduleId === sch.id && x.status === 'ACTIVE')) noteFirst(e.studentId, day, s.scheduledStart);
}
for (const [k, startIso] of Object.entries(firstClassByHolderDay).sort((a, b) => ms(a[1]) - ms(b[1]))) {
  const [holderId] = k.split('|');
  const entryAt = fmt(new Date(ms(startIso) - between(18, 45) * 60000 + between(0, 59) * 1000));
  if (!before(entryAt)) continue;
  const holder = holderById[holderId];
  const cred = credByHolder[holderId];
  const reader = rand() < 0.5 ? 'RDR-T-001' : 'RDR-T-002';
  if (cred.status === 'ACTIVE') access(reader, holder, entryAt, 'CAMPUS_ENTRY', 'GRANTED', 'NONE');
  else access(reader, holder, entryAt, 'CAMPUS_ENTRY', 'DENIED', 'CARD_INACTIVE');
}

// Asistencias de las sesiones ya iniciadas
for (const s of sessions.filter((x) => x.type === 'CLASS')) {
  const sch = classSchedules.find((c) => c.id === s.scheduleId);
  const course = courses.find((c) => c.id === sch.courseId);
  const readerId = readerOfSpace(s.spaceId);
  const windowOpen = fmt(new Date(ms(s.scheduledStart) - 15 * 60000));
  if (!before(windowOpen)) continue;
  const closeAt = fmt(new Date(ms(s.scheduledEnd) + 15 * 60000));
  const finished = before(closeAt);
  const teacher = holderById[sch.teacherId];
  const teacherShows = sch.id !== NO_SHOW && finished;
  const teacherIn = teacherShows ? at(Number(s.date.slice(8)), sch.startTime, between(-4, 3), between(0, 59)) : null;
  const limit = ms(s.scheduledStart) + s.toleranceMinutes * 60000;
  const hhmm = `${sch.startTime}–${sch.endTime}`;

  for (const e of enrollments.filter((x) => x.scheduleId === sch.id && x.status === 'ACTIVE')) {
    const student = holderById[e.studentId];
    const cred = credByHolder[student.id];
    const shows = rand() < 0.86;
    let checkInAt = shows ? fmt(new Date(ms(s.scheduledStart) + between(-14, 22) * 60000 + between(0, 59) * 1000)) : null;
    if (checkInAt && !before(checkInAt)) checkInAt = null;
    if (checkInAt && cred.status !== 'ACTIVE') {
      tap(readerId, null, cred.cardUid, checkInAt, 'REJECTED', 'Tarjeta inactiva. Acércate a servicios universitarios');
      checkInAt = null;
    }
    if (!checkInAt) {
      if (finished) {
        attendance({ id: nextId('att'), tapEventId: null, sessionId: s.id, cardHolderId: student.id, role: 'STUDENT', checkInAt: null, checkOutAt: null, durationMinutes: null, status: 'ABSENT', confirmedAt: closeAt, source: 'SYSTEM', modifiedBy: null, modifiedAt: null, editReason: null });
      }
      continue;
    }
    const ev = tap(readerId, cred, cred.cardUid, checkInAt, 'ATTENDANCE', `Asistencia tomada · ${course.name} · ${hhmm}`);
    const resolved = ms(checkInAt) <= limit ? 'PRESENT' : 'LATE';
    const confirmedAt = teacherIn ? (ms(checkInAt) > ms(teacherIn) ? checkInAt : teacherIn) : null;
    attendance({ id: nextId('att'), tapEventId: ev.id, sessionId: s.id, cardHolderId: student.id, role: 'STUDENT', checkInAt, checkOutAt: null, durationMinutes: null, status: teacherIn ? resolved : 'PENDING', confirmedAt, source: 'NFC', modifiedBy: null, modifiedAt: null, editReason: null }, ev.id);
  }

  if (teacherShows) {
    const cred = credByHolder[teacher.id];
    const confirmed = attendanceRecords.filter((a) => a.sessionId === s.id && a.role === 'STUDENT' && a.source === 'NFC' && ms(a.checkInAt) <= ms(teacherIn)).length;
    const evIn = tap(readerId, cred, cred.cardUid, teacherIn, 'ATTENDANCE', `Llegada registrada · ${course.name} – ${course.subject} · ${confirmed} asistencias confirmadas`);
    const checkOutAt = at(Number(s.date.slice(8)), sch.endTime, between(-6, 2), between(0, 59));
    const durationMinutes = minutesBetween(teacherIn, checkOutAt);
    tap(readerId, cred, cred.cardUid, checkOutAt, 'ATTENDANCE', `Salida registrada · Duración ${fmtDuration(durationMinutes)}`);
    attendance({ id: nextId('att'), tapEventId: evIn.id, sessionId: s.id, cardHolderId: teacher.id, role: 'TEACHER', checkInAt: teacherIn, checkOutAt, durationMinutes, status: ms(teacherIn) <= limit ? 'PRESENT' : 'LATE', confirmedAt: teacherIn, source: 'NFC', modifiedBy: null, modifiedAt: null, editReason: null }, evIn.id);
  }
  s.status = finished ? 'FINISHED' : 'SCHEDULED';
}

// Reunión del lunes
{
  const m = sessions.find((x) => x.id === 'mtg-01');
  const reader = 'RDR-D-005';
  for (const [t, time] of [[teachers[0], '2026-10-05T16:58:12'], [teachers[1], '2026-10-05T17:14:40']]) {
    const cred = credByHolder[t.id];
    const status = ms(time) <= ms(m.scheduledStart) + 10 * 60000 ? 'PRESENT' : 'LATE';
    const ev = tap(reader, cred, cred.cardUid, time, 'ATTENDANCE', `Asistencia registrada · ${m.title}`);
    attendance({ id: nextId('att'), tapEventId: ev.id, sessionId: m.id, cardHolderId: t.id, role: 'TEACHER', checkInAt: time, checkOutAt: null, durationMinutes: null, status, confirmedAt: time, source: 'NFC', modifiedBy: null, modifiedAt: null, editReason: null }, ev.id);
  }
  attendance({ id: nextId('att'), tapEventId: null, sessionId: m.id, cardHolderId: teachers[2].id, role: 'TEACHER', checkInAt: null, checkOutAt: null, durationMinutes: null, status: 'ABSENT', confirmedAt: '2026-10-05T18:15:00', source: 'SYSTEM', modifiedBy: null, modifiedAt: null, editReason: null });
  m.status = 'FINISHED';
}

// Jornadas de trabajadores (lun, mar cerradas; mié abierta)
staff.forEach((w, i) => {
  const cred = credByHolder[w.id];
  for (const day of [5, 6, 7]) {
    const entryAt = at(day, '07:00', between(-8, 9), between(0, 59));
    if (cred.status !== 'ACTIVE') {
      if (day === 7 && i === 3) access('RDR-T-001', w, entryAt, 'CAMPUS_ENTRY', 'DENIED', 'CARD_INACTIVE');
      continue;
    }
    const evIn = tap('RDR-T-001', cred, cred.cardUid, entryAt, 'WORK_SHIFT', 'Entrada registrada · Jornada iniciada');
    const shift = { id: nextId('ws'), cardHolderId: w.id, date: entryAt.slice(0, 10), entryAt, exitAt: null, workedMinutes: null, status: 'OPEN' };
    if (day < 7) {
      const exitAt = at(day, '15:00', between(0, 20), between(0, 59));
      shift.exitAt = exitAt; shift.workedMinutes = minutesBetween(entryAt, exitAt); shift.status = 'CLOSED';
      tap('RDR-T-003', cred, cred.cardUid, exitAt, 'WORK_SHIFT', `Salida registrada · ${fmtDuration(shift.workedMinutes)} trabajadas`);
    }
    workShifts.push(shift);
    addData('SPACE_AND_FACILITY', 'WORK_SHIFT', shift.id, entryAt, { status: shift.status, workedMinutes: shift.workedMinutes }, evIn.id);
  }
});

// Accesos a áreas restringidas y otros espacios (US12, US14)
access('RDR-D-003', staff[4], '2026-10-05T09:12:05', 'SPACE_ACCESS', 'GRANTED', 'NONE');
access('RDR-D-003', students[3], '2026-10-05T12:40:31', 'SPACE_ACCESS', 'DENIED', 'UNAUTHORIZED_ROLE');
access('RDR-D-003', staff[2], '2026-10-06T10:05:44', 'SPACE_ACCESS', 'DENIED', 'UNAUTHORIZED_ROLE');
access('RDR-D-002', students[0], '2026-10-06T15:22:10', 'SPACE_ACCESS', 'GRANTED', 'NONE');
access('RDR-D-002', students[9], '2026-10-06T15:25:51', 'SPACE_ACCESS', 'DENIED', 'UNAUTHORIZED_ROLE');
access('RDR-D-002', teachers[1], '2026-10-06T16:01:03', 'SPACE_ACCESS', 'GRANTED', 'NONE');
access('RDR-D-004', staff[0], '2026-10-06T11:30:00', 'SPACE_ACCESS', 'DENIED', 'SPACE_IN_MAINTENANCE');
access('RDR-D-001', students[12], '2026-10-06T17:10:20', 'SPACE_ACCESS', 'GRANTED', 'NONE');
access('RDR-D-001', students[20], '2026-10-06T17:12:02', 'SPACE_ACCESS', 'DENIED', 'CARD_INACTIVE');
access('RDR-D-006', students[2], '2026-10-07T09:05:40', 'SPACE_ACCESS', 'GRANTED', 'NONE');
access('RDR-D-003', null, '2026-10-07T08:41:17', 'SPACE_ACCESS', 'DENIED', 'CARD_NOT_REGISTERED', '04:9F:00:1B:7E');
access('RDR-T-003', students[4], '2026-10-06T12:05:00', 'CAMPUS_EXIT', 'GRANTED', 'NONE');
access('RDR-T-004', teachers[0], '2026-10-06T16:02:31', 'CAMPUS_EXIT', 'GRANTED', 'NONE');

// ---------- reportes ----------
function summarize(start, end) {
  const inRange = dataRecords.filter((d) => ms(d.occurredAt) >= ms(start) && ms(d.occurredAt) <= ms(end));
  const att = inRange.filter((d) => d.dataType === 'ATTENDANCE' && d.payload.role === 'STUDENT' && d.payload.status !== 'PENDING');
  const attended = att.filter((d) => ['PRESENT', 'LATE'].includes(d.payload.status)).length;
  const acc = inRange.filter((d) => d.dataType === 'ACCESS');
  const byHour = {};
  for (const d of inRange.filter((x) => x.dataType === 'CARD_READING')) {
    const h = d.occurredAt.slice(11, 13);
    byHour[h] = (byHour[h] ?? 0) + 1;
  }
  const peak = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];
  const incidentReaders = new Set(inRange.filter((d) => d.dataType === 'DEVICE_TELEMETRY').map((d) => d.subjectId));
  return {
    totalRecords: inRange.length,
    summary: {
      attendanceRate: att.length ? Math.round((attended / att.length) * 1000) / 10 : 0,
      accessGranted: acc.filter((d) => d.payload.decision === 'GRANTED').length,
      accessDenied: acc.filter((d) => d.payload.decision === 'DENIED').length,
      peakHour: peak ? `${peak[0]}:00` : null,
      readersWithIncidents: incidentReaders.size,
    },
  };
}
const reports = [
  ['rep-001', 'WEEKLY', '2026-09-28T00:00:00', '2026-10-04T23:59:59', '2026-10-05T07:00:00'],
  ['rep-002', 'WEEKLY', '2026-10-05T00:00:00', '2026-10-06T23:59:59', '2026-10-07T07:30:00'],
  ['rep-003', 'MONTHLY', '2026-10-01T00:00:00', '2026-10-31T23:59:59', '2026-10-07T08:00:00'],
].map(([id, reportType, periodStart, periodEnd, generatedAt]) => {
  const { totalRecords, summary } = summarize(periodStart, periodEnd < generatedAt ? periodEnd : generatedAt);
  return { id, reportType, periodStart, periodEnd, status: 'GENERATED', generatedAt, totalRecords, summary, requestedBy: 'usr-001' };
});

dataRecords.sort((a, b) => ms(a.occurredAt) - ms(b.occurredAt));
cardTapEvents.sort((a, b) => ms(a.tappedAt) - ms(b.tappedAt));
accessRecords.sort((a, b) => ms(a.attemptedAt) - ms(b.attemptedAt));

const db = {
  users, cardHolders, credentials, credentialStatusHistory, credentialPermissions,
  spaces, accessRecords, workShifts,
  courses, classSchedules, enrollments, sessions, sessionParticipants, attendanceRecords,
  readers, telemetry, incidents, cardTapEvents,
  dataRecords, reports, settings,
};
writeFileSync(OUT, JSON.stringify(db, null, 2) + '\n', 'utf8');
console.log(Object.entries(db).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : 'obj'}`).join('\n'));
