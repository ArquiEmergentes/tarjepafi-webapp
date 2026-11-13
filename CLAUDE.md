# Prompt para Claude Code · TarjePAFI · Sprint 1 (Administrador + Docente)

> Abre Claude Code en la carpeta raíz del repositorio (donde está el `README.md` del informe) y pega todo lo que está debajo de la línea.

---

Actúa como **Senior Frontend Engineer** experto en **Angular + TypeScript** y **Domain-Driven Design**. Vas a construir el **Sprint 1** de la aplicación web de **TarjePAFI** (startup PafiSolutions): una solución Smart Campus basada en credenciales NFC y lectores IoT para la UPC, sede San Miguel. No hay backend real: los datos se simulan con **json-server**.

## 0. Fuentes y cómo usarlas

- **`README.md` del informe:** úsalo para entender **la idea del producto**, el **Ubiquitous Language (2.4)** y las **User Stories de la sección 3.2**, que son los requisitos.
- **No sigas** los endpoints, permisos ni detalles tácticos del Capítulo V. La aplicación se define en **este prompt**. Si algo del README contradice este prompt, **manda este prompt**.
- **Figma (opcional, solo referencia visual):** file key `O6Xg9ewnVSa8wl5v8hAGNj`, página `04 - Mock-ups` (pantallas WEB-01…WEB-10 del admin) y `01 - Foundations` (Design System). Pueden existir pantallas que no están en Figma; respeta el estilo.
- Antes de programar, presenta un **plan breve**: estructura de carpetas, rutas, colecciones del `db.json` y la tabla de trazabilidad pantalla ↔ user story. **Espera mi confirmación.**

## 1. Alcance del Sprint 1

La app es **una sola aplicación web con login único** y vistas por rol: **Administrador, Docente, Estudiante y Trabajador**.

- **Sprint 1 = vistas de Administrador y Docente**, más un **Simulador de lector NFC** dentro de la vista del admin.
- Estudiante y Trabajador: si inician sesión, ven una pantalla "Tu portal estará disponible próximamente".
- Reservas de espacios (US03, US28) y las vistas de Estudiante/Trabajador quedan para el Sprint 2. La arquitectura debe permitir agregarlas sin rehacer nada.
- **No inventes funcionalidades**: nada de pagos, chats, redes sociales, gamificación, blockchain, reconocimiento facial, QR como mecanismo principal, ni funciones LMS (notas, exámenes, contenido). TarjePAFI no es un LMS.
- Todos los datos académicos (titulares, cursos, horarios, matrículas) son **simulados**. En la exposición se explicará que, con una alianza con la UPC, vendrían del Sistema Académico. Por eso esos datos se consumen desde su propio servicio de infraestructura, para poder cambiar la fuente sin tocar el dominio ni las vistas.

## 2. Stack

- **Angular** (última versión estable): standalone components, signals, control flow (`@if`, `@for`), lazy loading por bounded context.
- **TypeScript** `strict`, sin `any` innecesarios.
- **Angular Material** con **tema personalizado** basado en los tokens de TarjePAFI (sección 8). No dejes el look Material por defecto.
- **json-server** en `http://localhost:3000` con prefijo `/api/v1` (usa `json-server@0.17.4` + `routes.json`, o una alternativa equivalente).
- **i18n ES/EN** con selector en el header (ES por defecto).
- Gráficos simples (`ng2-charts`/Chart.js o SVG propio).
- Scripts: `start`, `api` y uno que levante ambos (por ejemplo con `concurrently`).

## 3. Arquitectura DDD (frontend)

Organiza por **bounded context** y, dentro de cada uno, por capas:

```
src/app/
  shared/                 # layout (shell, sidebar por rol, top-nav), status-badge, kpi-card,
                          # skeleton, empty-state, confirm-dialog, toast, page-header,
                          # base-api, base-assembler, reloj simulado (SimulatedClock)
  iam/                    # users, login, guards por rol, perfil
  credentials/            # cardHolders, credentials, historial, permisos, verificación de matrículas
  academic-attendance/    # courses, classSchedules, enrollments, sessions, sessionParticipants, attendanceRecords
  space-facility/         # spaces, accessRecords, workShifts  (reservations en Sprint 2)
  iot-monitoring/         # readers, telemetry, incidents, cardTapEvents, simulador NFC
  data-management/        # dataRecords, reports, dashboard
```

Cada contexto tiene:
- `domain/model`: entidades y value objects **con la lógica de dominio** (por ejemplo `Credential.canBeReactivated()`, `Session.isInProgress(now)`, `AttendanceRecord.resolveStatus(start, tolerance)`, `Reader.canProcessTaps()`).
- `application`: stores con signals y **casos de uso**, donde viven las reglas de la sección 6. json-server no aplica reglas de negocio, así que las validaciones y transiciones se hacen aquí.
- `infrastructure`: resources (DTO), assemblers y api endpoints. Ningún componente llama a `HttpClient` directamente.
- `presentation`: vistas y componentes.

Los contextos **solo comparten ids** (`cardHolderId`, `spaceId`, `readerId`, `cardUid`). El simulador NFC (IoT) crea un `cardTapEvent` y delega a casos de uso de Academic Attendance, Space/Facility o Credentials mediante servicios de aplicación. Ningún contexto escribe en las colecciones de otro.

## 4. Pantallas del Sprint 1

### Común
- **Login único** (correo + contraseña) con redirección por rol: ADMIN → Dashboard; TEACHER → Mis sesiones; STUDENT/STAFF → "Portal próximamente".
- **Guards** de autenticación y de rol. Sin sesión, al login; con rol incorrecto, "Acceso denegado".
- **Mi perfil**: datos del usuario y cerrar sesión.
- Shell con sidebar **según el rol** y header con sede ("Sede San Miguel"), idioma, notificaciones y perfil.

### Administrador
| ID | Pantalla | Qué hace | US |
|---|---|---|---|
| A1 | Dashboard | % de asistencia del día, accesos concedidos/denegados, lectores por estado, credenciales por estado, actividad reciente (últimos `cardTapEvents`). Calculado en vivo desde las colecciones. | Idea del producto |
| A2 | Credenciales | Lista de titulares/tarjetas (rol, UID, estado, último uso) con búsqueda y filtros. Detalle con: dar de baja, reactivar, bloquear, reportar pérdida, vincular/actualizar titular, historial de estados y pestaña **Permisos** (excepciones por tarjeta). | US10, US11, US13, US14 |
| A3 | Verificar matrículas | Botón que ejecuta el proceso de desactivación automática y muestra un resumen. | US15 |
| A4 | Lectores IoT | Lista con filtros y contadores por estado; registrar lector; detalle con pestañas Resumen, Configuración (editable), Telemetría e Incidencias; activar, desactivar y mantenimiento. | Idea del producto |
| A5 | Simulador de lector NFC | Elegir lector y tarjeta (o escribir un UID no registrado), ajustar la **hora simulada** y pulsar **"Pasar tarjeta"**. Muestra la "pantalla del lector" con el mensaje resultante y el historial de lecturas. | US01, US02, US04, US10, US12, US14, US16, US17, US18, US21, US22, US23, US24, US25 |
| A6 | Registros de acceso | Lecturas de acceso con lector, titular, tipo, decisión y motivo. | US12 |
| A7 | Reportes | Generar reporte semanal, mensual o semestral; lista; detalle con resumen; exportar CSV. | Idea del producto |

### Docente
| ID | Pantalla | Qué hace | US |
|---|---|---|---|
| D1 | Mis sesiones de hoy | Próxima sesión y sesiones del día (curso, materia, aula, horario, estado). | US25 |
| D2 | Sesión de clase | Lista de asistencia de sus estudiantes (estado, hora). Si no hay ninguna: "No existen asistencias registradas". **Editar asistencia** (Presente/Tarde/Ausente) con motivo obligatorio. | US16 |
| D3 | Mi asistencia docente | Historial con fecha y hora exactas de llegada y salida y la duración de cada clase. Muestra un estado vacío si no hay registros. | US17, US20, US22, US23 |
| D4 | Mis reuniones | Reuniones y capacitaciones donde marcó asistencia. | US21 |
| D5 | Mi perfil | Datos y estado de su credencial. | — |

Cada vista debe tener estados **loading (skeleton)**, **empty** y **error** (toast con opción de reintentar).

## 5. Modelo de datos (`db.json`)

Todas las colecciones usan `id` (string). Fechas en ISO 8601.

**IAM**
- `users`: id, email (único), password (texto plano, solo demo), role (`ADMIN`|`TEACHER`|`STUDENT`|`STAFF`), status (`ACTIVE`|`INACTIVE`|`SUSPENDED`), cardHolderId (opcional), fullName, createdAt, updatedAt

**Credentials**
- `cardHolders`: id, code (U2023…, D000…, T001…), fullName, email, role (`STUDENT`|`TEACHER`|`STAFF`), program, enrollmentStatus (`COMPLETED`|`PENDING`, solo estudiantes)
- `credentials`: id, cardUid (único, hex tipo `04:A2:7F:91:3C`), cardHolderId (**nullable** = tarjeta sin vincular), status (`ACTIVE`|`BLOCKED`|`LOST`|`DEACTIVATED`), issuedAt, statusChangedAt, lastUsedAt
- `credentialStatusHistory`: id, credentialId, fromStatus, toStatus, reason (`WITHDRAWAL`|`REENROLLMENT`|`ENROLLMENT_NOT_COMPLETED`|`LOST`|`MANUAL`), changedBy (userId o `SYSTEM`), changedAt
- `credentialPermissions`: id, credentialId, spaceId, effect (`ALLOW`|`DENY`)

**Space & Facility**
- `spaces`: id, code, name, type (`CLASSROOM`|`CAMPUS_ENTRANCE`|`CAMPUS_EXIT`|`RESTRICTED_AREA`|`LABORATORY`|`LIBRARY`|`MEETING_ROOM`|`STUDY_CUBICLE`), building, floor, capacity, status (`AVAILABLE`|`MAINTENANCE`), accessPolicy (`OPEN`|`RESTRICTED`), allowedRoles (array)
- `accessRecords`: id, tapEventId, cardUid, credentialId, cardHolderId, spaceId, readerId, accessType (`CAMPUS_ENTRY`|`CAMPUS_EXIT`|`SPACE_ACCESS`), decision (`GRANTED`|`DENIED`), denialReason (`NONE`|`CARD_NOT_REGISTERED`|`CARD_INACTIVE`|`UNAUTHORIZED_ROLE`|`SPACE_IN_MAINTENANCE`), attemptedAt
- `workShifts`: id, cardHolderId, date, entryAt, exitAt, workedMinutes, status (`OPEN`|`CLOSED`)

**Academic Attendance**
- `courses`: id, code, name, subject
- `classSchedules`: id, courseId, section, teacherId (cardHolderId), spaceId, dayOfWeek, startTime, endTime, term
- `enrollments`: id, studentId (cardHolderId), scheduleId, term, status (`ACTIVE`|`WITHDRAWN`)
- `sessions`: id, type (`CLASS`|`MEETING`), scheduleId (null en reuniones), title, spaceId, date, scheduledStart, scheduledEnd, toleranceMinutes, status (`SCHEDULED`|`IN_PROGRESS`|`FINISHED`)
- `sessionParticipants`: id, sessionId, cardHolderId (convocados a reuniones)
- `attendanceRecords`: id, tapEventId, sessionId, cardHolderId, role (`STUDENT`|`TEACHER`), checkInAt, checkOutAt, durationMinutes, status (`PENDING`|`PRESENT`|`LATE`|`ABSENT`), confirmedAt, source (`NFC`|`TEACHER_EDIT`|`SYSTEM`), modifiedBy, modifiedAt, editReason

**IoT Monitoring**
- `readers`: id (`RDR-X-000`), name, deviceType (`CLASSROOM_READER`|`TURNSTILE`|`DOOR_READER`|`DESK_READER`), spaceId, status (`REGISTERED`|`ACTIVE`|`INACTIVE`|`OFFLINE`|`DEGRADED`|`MAINTENANCE`), configuration {readerMode, communicationInterval, heartbeatInterval, firmwareVersion}, registeredAt, lastSeenAt
- `telemetry`: id, readerId, capturedAt, signalStrength, uptime, firmwareVersion, status
- `incidents`: id, readerId, type (`CONNECTIVITY_FAILURE`|`READ_ERROR`|`DEVICE_OFFLINE`|`CONFIGURATION_ERROR`|`HARDWARE_FAILURE`), detectedAt, description, resolvedAt
- `cardTapEvents`: id (eventId), readerId, cardUid, tappedAt, outcome (`ATTENDANCE`|`ACCESS`|`WORK_SHIFT`|`REJECTED`), displayMessage, source (`SIMULATOR`)

**Data Management**
- `dataRecords`: id, eventId, sourceContext (`IOT_MONITORING`|`ACADEMIC_ATTENDANCE`|`SPACE_AND_FACILITY`|`CREDENTIALS`), dataType (`CARD_READING`|`ATTENDANCE`|`ACCESS`|`WORK_SHIFT`|`CREDENTIAL_CHANGE`|`DEVICE_TELEMETRY`), subjectId, occurredAt, recordedAt, payload
- `reports`: id, reportType (`WEEKLY`|`MONTHLY`|`SEMESTER`), periodStart, periodEnd, status (`GENERATING`|`GENERATED`|`ERROR`), generatedAt, totalRecords, summary {attendanceRate, accessGranted, accessDenied, peakHour, readersWithIncidents}, requestedBy
- `settings`: term, enrollmentDeadline, defaultToleranceMinutes (10)

**Datos simulados (coherentes entre sí):** ciclo 2026-2, **1 semana** de clases (lunes 5 a sábado 10 de octubre de 2026), **6 cursos**, **4 docentes**, **40 estudiantes** (algunos con matrícula PENDING para probar US15), **8 trabajadores**, **15 espacios** (aulas, entrada/salida, área restringida, laboratorio, sala de reuniones), **20 lectores** (todos los estados), telemetría, incidencias, credenciales en todos los estados (y al menos 2 sin titular), sesiones de la semana con asistencias ya registradas, 2 reuniones con convocados, jornadas de trabajadores y algunos reportes. Usuarios demo (inclúyelos en el README de la app):
- `admin@upc.edu.pe` / `Admin123*` (ADMIN)
- `docente@upc.edu.pe` / `Docente123*` (TEACHER, vinculado a un titular con clases)
- `u202312966@upc.edu.pe` / `User123*` (STUDENT)

## 6. Reglas de negocio (implementar en la capa de aplicación)

**A. Acceso**
- Correo con formato inválido: "Ingresa un correo institucional válido."
- Credenciales incorrectas: "Correo o contraseña incorrectos." (sin indicar cuál falló).
- Usuario `INACTIVE`/`SUSPENDED`: "Tu cuenta no está habilitada. Contacta al administrador."

**B. Credenciales**
- Bloquear: `ACTIVE` → `BLOCKED` (motivo obligatorio). Reportar pérdida: `ACTIVE` → `LOST`.
- Dar de baja (US10): `ACTIVE`/`BLOCKED`/`LOST` → `DEACTIVATED`, con confirmación.
- Reactivar (US13): `BLOCKED`/`LOST`/`DEACTIVATED` → `ACTIVE`. Si es estudiante, su matrícula debe estar `COMPLETED`.
- Vincular (US11): si el titular no existe, "Titular no encontrado". Un titular solo puede tener **una** tarjeta `ACTIVE`.
- Verificar matrículas (US15): si la fecha actual (o simulada) supera `enrollmentDeadline`, las tarjetas `ACTIVE` de estudiantes con `enrollmentStatus = PENDING` pasan a `DEACTIVATED` (motivo `ENROLLMENT_NOT_COMPLETED`, autor `SYSTEM`). Las demás no cambian. Resumen: "X desactivadas, Y sin cambios".
- Permisos (US14): primero las excepciones de la tarjeta (`credentialPermissions`); si no hay, los `allowedRoles` del espacio.
- Todo cambio se guarda en `credentialStatusHistory` y en `dataRecords`.

**C. Lectores IoT**
- Registro: el ID `RDR-X-000` es único ("Ya existe un lector con ese ID"), todos los campos son obligatorios y nace en estado `REGISTERED`.
- Activar: `REGISTERED`/`INACTIVE` → `ACTIVE`. Desactivar (con confirmación): `ACTIVE`/`DEGRADED`/`OFFLINE` → `INACTIVE`. El mantenimiento se activa y desactiva manualmente.
- Configuración: intervalos > 0, `heartbeatInterval ≥ communicationInterval`, firmware con formato `x.y.z`. Si es inválida, se conserva la anterior.
- Si `lastSeenAt` supera 3 veces el heartbeat (según la hora simulada), el lector pasa a `OFFLINE` y se crea la incidencia `DEVICE_OFFLINE`.
- Solo los lectores `ACTIVE` o `DEGRADED` procesan lecturas; los demás responden "Lector fuera de servicio".

**D. Simulador · flujo de cada lectura**
1. Se crea un `cardTapEvent`. El `eventId` es único: nunca se procesa dos veces.
2. Se valida el lector.
3. Se busca la tarjeta por `cardUid`. Si no existe: **"Tarjeta no registrada"**. Si no está `ACTIVE`: **"Tarjeta inactiva. Acércate a servicios universitarios"**.
4. Se aplica la regla según `spaces.type` del lector:

*Aula · estudiante (US01, US02, US04)*
- La sesión está en curso desde 15 minutos antes del inicio hasta el fin. Si no hay sesión: "No hay una clase en curso en esta aula". Si el estudiante no está matriculado: "No estás matriculado en esta clase".
- Si ya marcó: "Tu asistencia ya fue registrada" (sin duplicar).
- Si todo está bien: "Asistencia tomada · *Curso* · 10:00–11:30". Si el docente aún no marcó, queda `PENDING`; si ya marcó, queda `PRESENT`/`LATE` en ese momento.
- `PRESENT` si `checkInAt ≤ inicio + tolerancia`; si no, `LATE`.

*Aula · docente (US16, US17, US18, US22, US23, US25)*
- Si no es el docente asignado o no hay sesión: "No tienes una clase asignada en esta aula a esta hora".
- 1ª pasada: llegada registrada, la sesión pasa a `IN_PROGRESS` y los `PENDING` se confirman como `PRESENT`/`LATE` según su propia hora. Mensaje: "Llegada registrada · *Curso – Materia* · N asistencias confirmadas", o "No existen asistencias registradas" si N = 0.
- 2ª pasada: salida registrada, duración calculada y la sesión pasa a `FINISHED`. Mensaje: "Salida registrada · Duración 1 h 28 min".
- 3ª pasada: "Tu salida ya fue registrada".

*Cierre de sesión*
- Si el docente no marca la salida, la sesión se cierra 15 minutos después de su fin (se evalúa con la hora simulada).
- Al cerrarse, se crea un registro `ABSENT` (source `SYSTEM`) por cada matriculado sin marcación.
- Si el docente nunca llegó, los `PENDING` quedan para que él los confirme desde su vista.

*Sala de reunión · docente (US21)*
- Si no está convocado: "No estás convocado a esta reunión". Si lo está, se registra directamente `PRESENT`/`LATE`.

*Área restringida (US12, US14)*
- **"Acceso concedido"** o **"Acceso denegado"**. El motivo se guarda en `accessRecords`.
- Si el espacio está en `MAINTENANCE`, se deniega.

*Entrada/salida · trabajador (US24)*
- Entrada: abre la jornada. Si ya tiene una abierta: "Tu jornada ya está abierta".
- Salida: cierra la jornada con "Salida registrada · 8 h 05 min trabajadas". Si no hay entrada: "No se encontró una entrada registrada". Si repite la salida: "Tu salida ya fue registrada".
- Estudiantes y docentes en el torniquete solo generan un `accessRecord`.

5. Toda lectura actualiza `credentials.lastUsedAt`, `readers.lastSeenAt` y crea un `dataRecord`.

**E. Edición de asistencia (docente)**
- Solo en **sus** sesiones `IN_PROGRESS` o `FINISHED`.
- Puede cambiar a Presente, Tarde o Ausente, con un motivo obligatorio de hasta 255 caracteres. Se guarda `source = TEACHER_EDIT`, `modifiedBy`, `modifiedAt` y `editReason`, y se muestra el indicador "Editado por el docente".

**F. Reportes y dashboard**
- Periodo: inicio ≤ fin; si no, "El periodo no es válido."
- Se crea en `GENERATING` y, tras unos segundos, pasa a `GENERATED` con el resumen calculado desde `dataRecords`. Sin datos: total 0 y "No hay datos en este periodo".
- El dashboard se calcula en vivo desde las colecciones.

## 7. Trazabilidad

Incluye en el README de la app una tabla **User Story → pantalla → regla → cómo probarla** (por ejemplo: "US16 → Simulador A5 + Sesión D2 → regla D/docente → pasar 3 estudiantes y luego al docente"). Esta tabla se usará para el Sprint Backlog 1 del informe.

## 8. Design System (estricto)

- **Tipografía:** Plus Jakarta Sans (títulos) e Inter (interfaz). H1 28 SemiBold, H2 22 Medium, H3 Inter 18 SemiBold, Body 16/14, Small 12 Medium, Botón 14 SemiBold.
- **Colores:** primary-navy #0A2540 (sidebar), electric-cyan #0284C7 (CTA, links, activo), brand-light #E0F2FE, text #0F172A, muted #475569, border #CBD5E1, bg #F8FAFC, white #FFFFFF, success #059669, warning #D97706, error #DC2626, info #2563EB. Para texto pequeño sobre fondo claro usa #0369A1 y #B45309 (WCAG AA).
- **Espaciado** en múltiplos de 8; radio 8 (botones, inputs) y 12 (cards, modales).
- **Componentes:**
  - Botones de 40 px: primario cyan, secundario con borde 1.5 cyan, destructivo rojo.
  - Inputs de 52 px con label permanente; los errores van en rojo, 4 px debajo, con icono.
  - Modal con backdrop #0F172A al 50 %.
  - Toast abajo a la derecha, 4 s.
  - Skeletons en lugar de pantallas en blanco.
  - **Status badge** siempre con icono + texto.
- **Layout:** 1440 de referencia, sidebar navy colapsable (240/72) y header de 64 px.
- **Tono:** serio y claro; los mensajes explican qué pasó y qué hacer, sin culpar al usuario.

## 9. Fases (confirma conmigo al final de cada una)

1. Scaffold, tema, shell por rol, i18n, json-server con el `db.json` completo, login y guards.
2. Credenciales (A2, A3).
3. Lectores IoT (A4).
4. Asistencia académica + Simulador NFC (A5, A6) + vistas del docente (D1–D5).
5. Dashboard (A1) y Reportes (A7).
6. README de la app con instalación, usuarios demo, estructura DDD y tabla de trazabilidad.

Al terminar cada fase, ejecuta `ng build` (y los tests si existen) y corrige los errores antes de continuar.
