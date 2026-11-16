# TarjePAFI · Aplicación web (Sprint 1)

Aplicación web de **TarjePAFI** (PafiSolutions): solución Smart Campus basada en credenciales NFC y lectores IoT para la **UPC, sede San Miguel**.
El Sprint 1 cubre las vistas de **Administrador** y **Docente**, más un **Simulador de lector NFC** dentro de la vista del administrador.

No hay backend real: los datos se simulan con **json-server** y todas las reglas de negocio viven en la capa de aplicación del frontend.

---

## Contenido

1. [Requisitos e instalación](#1-requisitos-e-instalación)
2. [Usuarios demo](#2-usuarios-demo)
3. [Hora simulada](#3-hora-simulada)
4. [Recorrido para la demo](#4-recorrido-para-la-demo)
5. [Arquitectura DDD](#5-arquitectura-ddd)
6. [Datos simulados](#6-datos-simulados)
7. [Trazabilidad User Story → pantalla → regla](#7-trazabilidad-user-story--pantalla--regla)
8. [Decisiones y supuestos](#8-decisiones-y-supuestos)
9. [Fuera de alcance del Sprint 1](#9-fuera-de-alcance-del-sprint-1)

---

## 1. Requisitos e instalación

**Requisitos:** Node.js 20.19+ (probado con Node 24) y npm 10+.

```bash
cd webapp
npm install
npm run dev
```

`npm run dev` levanta los dos servidores a la vez:

| Servicio | URL |
|---|---|
| Aplicación Angular | http://localhost:4200 |
| API simulada (json-server) | http://localhost:3000/api/v1 |

### Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | API + aplicación en paralelo (`concurrently`) |
| `npm start` | Solo la aplicación (`ng serve`) |
| `npm run api` | Solo la API (`json-server` 0.17.4 con `server/routes.json`, prefijo `/api/v1`) |
| `npm run api:seed` | Regenera `server/db.json` con los datos iniciales |
| `npm run build` | Compilación de producción (`ng build`) |
| `npm test` | Tests unitarios de dominio (Vitest) |

### Volver a los datos iniciales

La aplicación escribe en `server/db.json` mientras la usas. Para empezar de nuevo:

1. Detén `npm run dev`.
2. Ejecuta `npm run api:seed`.
3. Vuelve a ejecutar `npm run dev`.

> json-server se ejecuta **sin `--watch`** a propósito: con `--watch`, la versión 0.17 se reinicia al detectar sus propias escrituras y rechaza peticiones por unos instantes. Por eso hay que reiniciar la API después de regenerar los datos.

Si la hora simulada quedó en otro valor en tu navegador, usa **Restablecer** en el Simulador NFC (vuelve al miércoles 7 de octubre de 2026, 09:50).

---

## 2. Usuarios demo

| Correo | Contraseña | Rol | Al iniciar sesión |
|---|---|---|---|
| `admin@upc.edu.pe` | `Admin123*` | Administrador | Dashboard |
| `docente@upc.edu.pe` | `Docente123*` | Docente (Carlos Mendoza Ríos, D0001) | Mis sesiones |
| `u202312966@upc.edu.pe` | `User123*` | Estudiante (Javier Gonzales Paredes) | "Tu portal estará disponible próximamente" |

Usuarios adicionales para probar las reglas de acceso (6.A):

| Correo | Contraseña | Para probar |
|---|---|---|
| `trabajador@upc.edu.pe` | `User123*` | Trabajador → portal próximamente |
| `lparedes@upc.edu.pe` | `Docente123*` | Otro docente con clases |
| `jsalazar@upc.edu.pe` | `Docente123*` | Cuenta **INACTIVE** → "Tu cuenta no está habilitada…" |
| `soporte@upc.edu.pe` | `Admin123*` | Cuenta **SUSPENDED** → "Tu cuenta no está habilitada…" |

Solo se aceptan correos institucionales `@upc.edu.pe`.

---

## 3. Hora simulada

Todas las reglas que dependen del horario (ventanas de asistencia, cierre de sesiones, lectores sin heartbeat, verificación de matrículas, dashboard) usan una **hora simulada**, no la hora del computador.

- Empieza el **miércoles 7 de octubre de 2026 a las 09:50**, 10 minutos antes de la clase *Aplicaciones Web* del docente demo (Aula A-301, 10:00–11:30).
- Se ve siempre en el header y se cambia desde el **Simulador NFC** (+5, +15, +60 min, fecha y hora exactas o Restablecer).
- Al **adelantarla**:
  1. Los lectores sanos envían su heartbeat en la nueva hora.
  2. Los lectores que ya no se comunicaban, o a los que se les activó una **falla simulada**, pasan a *Sin conexión* si superan 3 heartbeats y se abre la incidencia `DEVICE_OFFLINE`.
  3. Se cierran las sesiones que pasaron 15 minutos de su fin.

---

## 4. Recorrido para la demo

Con los datos iniciales y la hora en 09:50 del miércoles:

1. **Admin → Simulador NFC.** Escenario rápido *Estudiante en A-301* → **Pasar tarjeta** → "Asistencia tomada · Aplicaciones Web · 10:00–11:30".
2. Escenario *Docente en A-301* → "Llegada registrada · Aplicaciones Web – Desarrollo de Software · 1 asistencias confirmadas" (el Pendiente del paso 1 pasa a Presente).
3. Adelantar la hora +15 min dos veces (10:20) y pasar la tarjeta de `U202310685` en `RDR-A-301` → queda **Tarde**.
4. Adelantar +60 min (11:20) y pasar otra vez al docente → "Salida registrada · Duración 1 h 30 min". Los matriculados sin marcación quedan **Ausente**.
5. **Docente → Mis sesiones → Aplicaciones Web.** Ver la lista, editar una asistencia con motivo y ver el indicador "Editado por el docente".
6. **Admin → Dashboard y Reportes.** Ver los indicadores del día y generar un reporte semanal; exportarlo a CSV.

---

## 5. Arquitectura DDD

Angular 21 (standalone components, signals, control flow `@if`/`@for`), TypeScript `strict` y Angular Material con tema propio basado en el Design System de TarjePAFI. Cada bounded context se carga de forma diferida (lazy loading).

```
src/app/
  shared/                 Kernel compartido: layout (shell, sidebar por rol, header), componentes
                          (status-badge, kpi-card, skeleton, empty-state, confirm-dialog, paginación,
                          gráficos SVG), toast, base-api, base-assembler, SimulatedClock, puertos
                          (SESSION_PORT, NOTIFICATION_SOURCES) y el contrato TapResult/TapContext.
  iam/                    Usuarios, login, guards por rol, perfil.
  credentials/            Titulares, credenciales, historial de estados, permisos, verificación de matrículas.
  academic-attendance/    Cursos, horarios, matrículas, sesiones, convocados, asistencias; vistas del docente.
  space-facility/         Espacios, registros de acceso y jornadas de trabajadores.
  iot-monitoring/         Lectores, telemetría, incidencias, lecturas NFC y simulador.
  data-management/        Registros de datos (dataRecords), reportes y dashboard.
```

Cada contexto se organiza en cuatro capas:

| Capa | Contenido | Ejemplos |
|---|---|---|
| `domain/model` | Entidades y value objects **con la lógica de dominio** | `Credential.canBeReactivated()`, `Session.isInProgress(now)`, `AttendanceRecord.resolveStatus(…)`, `Reader.canProcessTaps()`, `Reader.hasLostConnection(now)` |
| `application` | Stores con signals y **casos de uso**; aquí viven las reglas de la sección 6 (json-server no valida nada) | `CredentialsStore`, `ReadersStore`, `AttendanceTapService`, `TeacherWorkspace`, `ReportsStore` |
| `infrastructure` | Resources (DTO), assemblers y endpoints. **Ningún componente llama a `HttpClient`** | `CredentialsApiEndpoint`, `SessionsApiEndpoint` |
| `presentation` | Vistas, componentes y rutas | `credential-list`, `simulator`, `session-detail` |

### Comunicación entre contextos

Los contextos **solo comparten ids** (`cardHolderId`, `spaceId`, `readerId`, `cardUid`) y **ningún contexto escribe en las colecciones de otro**. Cuando uno necesita algo de otro, lo pide a un servicio de aplicación del dueño:

| Servicio | Contexto dueño | Lo usan |
|---|---|---|
| `CredentialDirectory` | Credentials | Simulador (buscar tarjeta por UID, actualizar `lastUsedAt`), Space & Facility (permisos US14), vistas del docente y perfil (nombres y credencial) |
| `AttendanceTapService` | Academic Attendance | Simulador (aula y reuniones) |
| `AccessControlService` | Space & Facility | Simulador (espacios, torniquetes y jornadas) |
| `SpaceCatalog` | Space & Facility | Credentials (permisos), IoT (ubicación de lectores), docente |
| `DataRecorder` | Data Management | Todos: cada hecho se registra en `dataRecords` a través de él |
| `ReadersStore` · `TapEventsQuery` · `AttendanceOverview` | IoT · Academic Attendance | Dashboard |

**Flujo de una lectura en el simulador:** IoT crea el `cardTapEvent` → valida el lector → `CredentialDirectory` busca la tarjeta → según `spaces.type` del lector delega en `AttendanceTapService` (aula, sala de reuniones) o en `AccessControlService` (áreas restringidas, laboratorios, torniquetes) → actualiza `lastSeenAt` del lector y `lastUsedAt` de la tarjeta → registra un `dataRecord`.

### Datos académicos simulados

Titulares, cursos, horarios y matrículas se consumen desde servicios de infraestructura propios (`AcademicSystemCardHoldersApi`, `AcademicSystemCoursesApi`, `AcademicSystemSchedulesApi`, `AcademicSystemEnrollmentsApi`). Hoy leen de json-server; con una alianza con la UPC vendrían del **Sistema Académico** y solo habría que reemplazar esos servicios, sin tocar el dominio ni las vistas. Por eso TarjePAFI no crea estudiantes, docentes ni trabajadores: los **recibe** de la UPC y gestiona su credencial.

### Design System

Tokens en `src/styles.scss` (sección 8 del prompt): Plus Jakarta Sans e Inter, navy `#0A2540`, cyan `#0284C7`, espaciado de 8, radios 8/12, botones de 40 px, inputs de 52 px, toast abajo a la derecha (4 s), backdrop al 50 %, badges siempre con icono + texto y skeletons en lugar de pantallas en blanco. Cada vista tiene estados de carga, vacío y error (toast con **Reintentar**). La interfaz está en español e inglés (selector ES/EN en el header).

---

## 6. Datos simulados

`server/seed/generate-db.mjs` genera datos deterministas y coherentes entre sí para el ciclo **2026-2**, semana del **lunes 5 al sábado 10 de octubre de 2026**:

| Colección | Datos |
|---|---|
| `cardHolders` / `credentials` | 40 estudiantes, 4 docentes, 8 trabajadores; 55 tarjetas en todos los estados y 2 sin titular |
| `courses` / `classSchedules` / `enrollments` | 6 cursos, 12 horarios, 240 matrículas |
| `sessions` / `attendanceRecords` | 12 clases de la semana y 2 reuniones; asistencias ya registradas hasta el miércoles 09:50 |
| `spaces` / `readers` | 15 espacios (aulas, entrada/salida, áreas restringidas, laboratorios, sala de docentes, biblioteca, cubículo) y 20 lectores en todos los estados |
| `telemetry` / `incidents` | 6 muestras por lector y 6 incidencias (4 abiertas) |
| `cardTapEvents` / `accessRecords` / `workShifts` | Lecturas, accesos y jornadas de la semana |
| `dataRecords` / `reports` | Hechos de todos los contextos y 3 reportes generados |
| `settings` | Ciclo 2026-2, fecha límite de matrícula 03/10/2026, tolerancia 10 min |

Datos útiles para probar:

| Qué | Dato |
|---|---|
| Estudiante demo (matriculado en Aplicaciones Web) | `U202312966` · tarjeta `04:3D:9B:12:8F` |
| Estudiante no matriculado en Aplicaciones Web | `U202310137` |
| Estudiante con matrícula pendiente y tarjeta activa | `U202310685` (y otros 4) |
| Tarjeta bloqueada | `U202311918` |
| Tarjeta perdida con otra activa del mismo titular | `U202311096` |
| Tarjeta desactivada por matrícula no completada | `U202413151` |
| Tarjetas sin titular | `cred-054` (`04:AD:7A:80:59`), `cred-055` |
| UID no registrado | `04:FF:12:AB:90` |
| Excepciones de permisos | `U202312966` → **ALLOW** en LAB-E104; `T0003` → **DENY** en Sala de Servidores |
| Clase del docente demo hoy | Aplicaciones Web · Aula A-301 · 10:00–11:30 (`RDR-A-301`) |
| Clase sin docente (pendientes por confirmar) | Arquitectura de Software · martes 6 · 14:00 |
| Reunión con convocados | Capacitación · jueves 8 · 16:00 · Sala de Docentes (`RDR-D-005`); convocados D0001–D0003, no D0004 |
| Lector que pasará a sin conexión | `RDR-T-004` (sin heartbeat desde 09:40) |
| Lectores fuera de servicio | `RDR-K-001` (REGISTERED), `RDR-K-002` (INACTIVE), `RDR-D-007` (MAINTENANCE), `RDR-C-107` (OFFLINE) |
| Espacio en mantenimiento | Archivo Académico (`RDR-D-004`) |
| Trabajador con jornada abierta | `T0001` (entrada el miércoles ~07:00) |

---

## 7. Trazabilidad User Story → pantalla → regla

Pantallas: **A1** Dashboard · **A2** Credenciales · **A3** Verificar matrículas · **A4** Lectores IoT · **A5** Simulador NFC · **A6** Registros de acceso · **A7** Reportes · **D1** Mis sesiones · **D2** Sesión de clase · **D3** Mi asistencia docente · **D4** Mis reuniones · **D5** Mi perfil.
Reglas: sección 6 del prompt del Sprint 1 (**A** Acceso, **B** Credenciales, **C** Lectores IoT, **D** Simulador, **E** Edición de asistencia, **F** Reportes y dashboard).

Salvo que se indique otra hora, cada prueba parte de los datos iniciales y la hora simulada en **miércoles 09:50**.

| US | Título | Pantalla | Regla | Cómo probarla |
|---|---|---|---|---|
| US01 | Registro de Asistencia Estudiantil | A5 → D2 | D · aula/estudiante | En A5, escenario *Estudiante en A-301* → Pasar tarjeta. En D2 (docente) el estudiante aparece como **Pendiente**. Volver a pasarla → "Tu asistencia ya fue registrada". `U202310137` en `RDR-A-301` → "No estás matriculado en esta clase". |
| US02 | Confirmación de Asistencia | A5 | D · aula/estudiante | Al pasar la tarjeta del estudiante, la pantalla del lector muestra "Asistencia tomada · Aplicaciones Web · 10:00–11:30". |
| US04 | Visualización del Horario de Clase | A5 | D · aula/estudiante | El mismo mensaje incluye el curso y el horario (10:00–11:30). Fuera de la ventana (antes de 09:45 o después de 11:30) → "No hay una clase en curso en esta aula". |
| US10 | Baja de Tarjeta para Estudiantes Retirados | A2 | B · dar de baja | Abrir una tarjeta activa → **Dar de baja** → elegir motivo *Retiro* → confirmar. Pasa a Desactivada y queda en el historial. En A5, esa tarjeta → "Tarjeta inactiva. Acércate a servicios universitarios". |
| US11 | Vinculación a Base de Datos | A2 | B · vincular | Abrir `cred-054` (sin titular) → **Vincular titular** → código `U999` → "Titular no encontrado". Código `U202312966` → error porque ya tiene una tarjeta activa. Un titular solo puede tener una tarjeta ACTIVE. |
| US12 | Control de Acceso en Áreas Restringidas | A5 → A6 | D · área restringida | Escenario *Estudiante en Sala de Servidores* → "Acceso denegado". En A6 aparece con motivo *Sin permiso para el espacio*. `T0001` en `RDR-D-004` → denegado por *Espacio en mantenimiento*. |
| US13 | Reactivación de Tarjetas | A2 | B · reactivar | Bloquear una tarjeta y **Reactivar** → vuelve a Activa. Reactivar `U202413151` → "No se puede reactivar: la matrícula del estudiante está pendiente". Reactivar `cred-009` (`U202311096`) → error porque ya tiene otra tarjeta activa. |
| US14 | Personalización de Permisos de Acceso | A2 (Permisos) → A5 | B · permisos | En la tarjeta de `U202312966`, pestaña **Permisos**: LAB-E104 *Concedido por excepción*. En A5, esa tarjeta en `RDR-D-002` → "Acceso concedido" aunque el rol Estudiante no está permitido. Agregar o quitar una excepción cambia el acceso efectivo. |
| US15 | Desactivación Automática de Tarjetas | A3 | B · verificar matrículas | La hora (07/10) supera la fecha límite (03/10). Se listan 5 tarjetas por desactivar → **Ejecutar verificación** → "5 desactivadas, 31 sin cambios". En el historial: motivo *Matrícula no completada*, autor *Sistema*. |
| US16 | Registro de Asistencia Docente | A5 → D2 | D · aula/docente | Pasar 2 estudiantes en `RDR-A-301` (`U202312966` y `U202310411`) y luego el escenario *Docente en A-301* → "Llegada registrada · Aplicaciones Web – Desarrollo de Software · 2 asistencias confirmadas". En D2 los Pendiente pasan a Presente. Si el docente pasa primero → "… · No existen asistencias registradas". |
| US17 | Registro de Horas de Trabajo | A5 → D3 | D · aula/docente | Tras la llegada, adelantar la hora a 11:20 y pasar de nuevo al docente → "Salida registrada · Duración 1 h 30 min". En D3 se ven la llegada, la salida y la duración. |
| US18 | Confirmación de Registro de Asistencia | A5 | D · aula/docente | Cada pasada del docente muestra su confirmación en la pantalla del lector. La 3ª pasada → "Tu salida ya fue registrada". |
| US20 | Historial de Asistencia Docente | D3 | D · aula/docente | Iniciar sesión como docente → **Mi asistencia docente**: fecha, llegada y salida exactas, duración y estado. Sin registros muestra un estado vacío. |
| US21 | Registro de Asistencia en Reuniones | A5 → D4 | D · reunión | Hora en jueves 08/10 15:58. Pasar `D0001` en `RDR-D-005` → "Asistencia registrada · Capacitación: uso de lectores NFC en aula". En D4 aparece como Presente. `D0004` (no convocada) en el mismo lector → "No estás convocado a esta reunión". |
| US22 | Registro de Llegada a Clases | A5 → D2 · D3 | D · aula/docente | 1ª pasada del docente: llegada registrada (Presente si es antes de 10:10, si no Tarde) y la sesión pasa a *En curso*. Se ve en D2 (*Mi llegada*) y D3. Otro docente en `RDR-A-301` → "No tienes una clase asignada en esta aula a esta hora". |
| US23 | Registro de Duración de Clases | A5 → D2 · D3 | D · aula/docente | 2ª pasada del docente: duración calculada (llegada → salida) y sesión *Finalizada*. Los matriculados sin marcación quedan Ausente. Si el docente no marca la salida, la sesión se cierra sola 15 min después del fin. |
| US24 | Cierre de turno | A5 | D · torniquete/trabajador | Escenario *Trabajador en salida* (`T0001` en `RDR-T-003`) → "Salida registrada · 2 h 53 min trabajadas" (las horas dependen de la hora simulada). Repetir → "Tu salida ya fue registrada". Antes de la salida, `T0001` en `RDR-T-001` (entrada) → "Tu jornada ya está abierta". Con la jornada cerrada, adelantar la hora al jueves y pasar `T0001` en `RDR-T-003` → "No se encontró una entrada registrada". |
| US25 | Registro de Curso y Materia | D1 · D2 · A5 | D · aula/docente | D1 muestra la próxima sesión y las del día con curso, materia, sección, aula, horario y estado. El mensaje de llegada del docente incluye "Curso – Materia". |

Pantallas sin user story específica (idea del producto):

| Pantalla | Regla | Cómo probarla |
|---|---|---|
| A1 Dashboard | F | Ver asistencia del día, accesos, lectores y credenciales por estado y actividad reciente. Pasar una tarjeta en A5 y **Actualizar**: aparece en la actividad reciente. |
| A4 Lectores IoT | C | Registrar `RDR-A-301` → "Ya existe un lector con ese ID". Registrar `RDR-A-304` → queda *Registrado* → Activar. Guardar firmware `2.5` → error y se conserva la configuración anterior. `RDR-T-004` pasa a *Sin conexión* con incidencia → **Ejecutar health check** lo reconecta. |
| A5 Simulador · conectividad | C · D | Activar **Falla** en `RDR-A-302` y adelantar la hora +15 min → pasa a *Sin conexión*. Pasar una tarjeta en `RDR-K-002` → "Lector fuera de servicio". **Reenviar** un evento del historial → "Evento ya procesado" (idempotencia por `eventId`). |
| A7 Reportes | F | Periodo con inicio posterior al fin → "El periodo no es válido.". Generar semanal → *Generando* → *Generado* en unos segundos. Enero 2025 → "No hay datos en este periodo". Detalle → **Exportar CSV**. |
| D2 Edición de asistencia | E | En una sesión en curso o finalizada → **Editar** → elegir estado → el botón se habilita solo con motivo (máx. 255) → aparece "Editado por el docente". En la clase del martes 14:00 (sin docente) → **Confirmar pendientes**. |
| Login y guards | A | `admin@gmail.com` → "Ingresa un correo institucional válido." Contraseña errada → "Correo o contraseña incorrectos." `soporte@upc.edu.pe` → "Tu cuenta no está habilitada. Contacta al administrador." Admin en `/teacher/sessions` → *Acceso denegado*. |

---

## 8. Decisiones y supuestos

- **Ausencias:** al marcar la llegada del docente no se marca ausente a nadie; los estudiantes pueden seguir marcando hasta el fin de la clase. Los **Ausente** se registran cuando la sesión se cierra (salida del docente o 15 min después del fin).
- **Docente que nunca llegó:** al cerrarse la sesión, los Pendiente se conservan y el docente los confirma desde D2 (**Confirmar pendientes**).
- **Tarjeta activa sin titular:** el lector responde "Tarjeta inactiva. Acércate a servicios universitarios", porque no hay a quién registrar la lectura.
- **Mensajes del lector:** `cardTapEvents.displayMessage` se guarda **siempre en español** (idioma de los lectores del campus); la pantalla del simulador lo traduce según el idioma de la interfaz.
- **Heartbeats simulados:** al adelantar la hora, los lectores sanos envían su heartbeat; la falla de conexión se provoca a propósito desde el simulador. Un lector con falla simulada no responde al health check.
- **Reportes:** cada asistencia genera un `dataRecord` por cada cambio de estado; el reporte toma el último de cada asistencia y no cuenta los Pendiente.
- **Historial de credenciales:** `credentialStatusHistory` incluye un campo opcional `note` para guardar el motivo escrito por el administrador (por ejemplo, al bloquear) y el titular en las vinculaciones.
- **Gráficos:** SVG/HTML propios en lugar de Chart.js, para mantener el bundle inicial por debajo de 500 kB.

---

## 9. Fuera de alcance del Sprint 1

- Reservas de espacios (US03, US28) y las vistas de Estudiante y Trabajador (hoy muestran "Tu portal estará disponible próximamente"). La arquitectura permite agregarlas como nuevas rutas y casos de uso de `space-facility` sin rehacer nada.
- Alta de estudiantes, docentes y trabajadores: vendrían del Sistema Académico de la UPC.
- TarjePAFI no es un LMS: no maneja notas, exámenes ni contenido de cursos.
