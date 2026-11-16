# language: es
@integration
Característica: Servicios web de Academic Attendance (Fake API /api/v1)
  Como Web App de TarjePAFI,
  necesito consultar cursos, sesiones, matrículas y asistencias en la API,
  para validar cada lectura del aula y mostrar el curso y el horario de la clase.

  Antecedentes:
    Dado que la Fake API de TarjePAFI está disponible

  @US04 @US25
  Escenario: Consultar la sesión de clase del miércoles en el Aula A-301
    Cuando consulto el recurso "/sessions?spaceId=sp-a301&date=2026-10-07"
    Entonces la respuesta tiene el código HTTP 200
    Y la respuesta es una lista con 1 elemento
    Y el campo "type" es "CLASS"
    Y el campo "scheduledStart" es "2026-10-07T10:00:00"
    Y el campo "scheduledEnd" es "2026-10-07T11:30:00"
    Y el campo "toleranceMinutes" es "10"

  @US25
  Escenario: Consultar el curso y la materia
    Cuando consulto el recurso "/courses/crs-01"
    Entonces la respuesta tiene el código HTTP 200
    Y el campo "name" es "Aplicaciones Web"
    Y el campo "subject" es "Desarrollo de Software"

  @US01
  Escenario: Consultar las matrículas activas de un estudiante
    Cuando consulto el recurso "/enrollments?studentId=ch-u202312966&status=ACTIVE"
    Entonces la respuesta tiene el código HTTP 200
    Y la respuesta es una lista no vacía
    Y todos los elementos tienen el campo "term" igual a "2026-2"

  @US01 @US16
  Escenario: Las asistencias registradas incluyen hora, estado y origen
    Cuando consulto el recurso "/attendanceRecords?cardHolderId=ch-u202312966&_limit=5"
    Entonces la respuesta tiene el código HTTP 200
    Y la respuesta es una lista no vacía
    Y cada elemento incluye los campos:
      | sessionId    |
      | cardHolderId |
      | role         |
      | checkInAt    |
      | status       |
      | source       |

  @US21
  Escenario: Consultar los convocados de una reunión
    Cuando consulto el recurso "/sessions?type=MEETING"
    Entonces la respuesta tiene el código HTTP 200
    Y la respuesta es una lista con 2 elementos
    Y todos los elementos tienen el campo "type" igual a "MEETING"
