# language: es
@integration
Característica: Servicios web de Space & Facility (Fake API /api/v1)
  Como Web App de TarjePAFI,
  necesito consultar espacios, registros de acceso y jornadas en la API,
  para decidir el acceso a cada espacio y calcular las horas trabajadas.

  Antecedentes:
    Dado que la Fake API de TarjePAFI está disponible

  @US12
  Escenario: La Sala de Servidores es un área restringida solo para trabajadores
    Cuando consulto el recurso "/spaces/sp-srv"
    Entonces la respuesta tiene el código HTTP 200
    Y el campo "type" es "RESTRICTED_AREA"
    Y el campo "accessPolicy" es "RESTRICTED"
    Y el campo "allowedRoles" es "STAFF"

  @US12
  Escenario: Los accesos denegados guardan el motivo
    Cuando consulto el recurso "/accessRecords?decision=DENIED&_limit=5"
    Entonces la respuesta tiene el código HTTP 200
    Y todos los elementos tienen el campo "decision" igual a "DENIED"
    Y cada elemento incluye los campos:
      | cardUid      |
      | spaceId      |
      | readerId     |
      | denialReason |
      | attemptedAt  |

  @US24
  Escenario: La jornada abierta de un trabajador no tiene salida
    Cuando consulto el recurso "/workShifts?cardHolderId=ch-t0001&date=2026-10-07"
    Entonces la respuesta tiene el código HTTP 200
    Y la respuesta es una lista con 1 elemento
    Y el campo "status" es "OPEN"
    Y el campo "exitAt" es "null"
