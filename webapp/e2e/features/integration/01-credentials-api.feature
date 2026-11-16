# language: es
@integration
Característica: Servicios web de Credentials (Fake API /api/v1)
  Como Web App de TarjePAFI,
  necesito consultar titulares, credenciales y permisos en la API,
  para resolver a quién pertenece cada tarjeta y qué espacios puede usar.

  Antecedentes:
    Dado que la Fake API de TarjePAFI está disponible

  @US11
  Escenario: Buscar una credencial por el UID leído en el lector
    Cuando consulto el recurso "/credentials?cardUid=04:3D:9B:12:8F"
    Entonces la respuesta tiene el código HTTP 200
    Y la respuesta es una lista con 1 elemento
    Y el campo "cardHolderId" es "ch-u202312966"
    Y el campo "status" es "ACTIVE"
    Y cada elemento incluye los campos:
      | id              |
      | cardUid         |
      | cardHolderId    |
      | status          |
      | issuedAt        |
      | statusChangedAt |
      | lastUsedAt      |

  @US11
  Escenario: Buscar un titular por su código institucional
    Cuando consulto el recurso "/cardHolders?code=U202312966"
    Entonces la respuesta tiene el código HTTP 200
    Y la respuesta es una lista con 1 elemento
    Y el campo "fullName" es "Javier Gonzales Paredes"
    Y el campo "role" es "STUDENT"
    Y el campo "enrollmentStatus" es "COMPLETED"

  @US11
  Escenario: Un código de titular inexistente devuelve una lista vacía
    Cuando consulto el recurso "/cardHolders?code=U999"
    Entonces la respuesta tiene el código HTTP 200
    Y la respuesta es una lista con 0 elementos

  @US14
  Escenario: Consultar las excepciones de permisos de una tarjeta
    Cuando consulto el recurso "/credentialPermissions?credentialId=cred-001"
    Entonces la respuesta tiene el código HTTP 200
    Y la respuesta es una lista con 1 elemento
    Y el campo "spaceId" es "sp-lab-e"
    Y el campo "effect" es "ALLOW"

  @US15
  Escenario: Obtener la fecha límite de matrícula del ciclo
    Cuando consulto el recurso "/settings"
    Entonces la respuesta tiene el código HTTP 200
    Y el campo "term" es "2026-2"
    Y el campo "enrollmentDeadline" es "2026-10-03T23:59:59"

  @US13
  Escenario: Una credencial que no existe devuelve 404
    Cuando consulto el recurso "/credentials/cred-999"
    Entonces la respuesta tiene el código HTTP 404
