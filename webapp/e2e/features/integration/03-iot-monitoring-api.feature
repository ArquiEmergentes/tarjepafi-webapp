# language: es
@integration
Característica: Servicios web de IoT Monitoring (Fake API /api/v1)
  Como Web App de TarjePAFI,
  necesito registrar y consultar lectores NFC y sus lecturas en la API,
  para operar el simulador y monitorear la conectividad de los dispositivos.

  Antecedentes:
    Dado que la Fake API de TarjePAFI está disponible

  Escenario: Consultar un lector con su configuración
    Cuando consulto el recurso "/readers/RDR-A-301"
    Entonces la respuesta tiene el código HTTP 200
    Y el campo "status" es "ACTIVE"
    Y el campo "spaceId" es "sp-a301"
    Y el campo "configuration.readerMode" es "ATTENDANCE"
    Y el campo "configuration.firmwareVersion" es "2.4.1"

  Escenario: Registrar un lector y activarlo
    Cuando registro un lector con el cuerpo:
      """
      {
        "id": "RDR-Z-901",
        "name": "Lector de prueba Z-901",
        "deviceType": "DOOR_READER",
        "spaceId": "sp-bib",
        "status": "REGISTERED",
        "configuration": { "readerMode": "ACCESS_CONTROL", "communicationInterval": 30, "heartbeatInterval": 60, "firmwareVersion": "2.4.1" },
        "registeredAt": "2026-10-07T09:50:00",
        "lastSeenAt": null
      }
      """
    Entonces la respuesta tiene el código HTTP 201
    Y el campo "status" es "REGISTERED"
    Cuando actualizo el lector "RDR-Z-901" con:
      """
      { "status": "ACTIVE", "lastSeenAt": "2026-10-07T09:51:00" }
      """
    Entonces la respuesta tiene el código HTTP 200
    Y el campo "status" es "ACTIVE"
    Cuando consulto el recurso "/readers/RDR-Z-901"
    Entonces la respuesta tiene el código HTTP 200
    Y el campo "status" es "ACTIVE"
    Y el campo "lastSeenAt" es "2026-10-07T09:51:00"

  Escenario: Un lector que no existe devuelve 404
    Cuando consulto el recurso "/readers/RDR-Z-999"
    Entonces la respuesta tiene el código HTTP 404

  @US01 @US02
  Escenario: Las lecturas NFC guardan el resultado y el mensaje mostrado en el lector
    Cuando consulto el recurso "/cardTapEvents?outcome=ATTENDANCE&_limit=5"
    Entonces la respuesta tiene el código HTTP 200
    Y la respuesta es una lista no vacía
    Y cada elemento incluye los campos:
      | id             |
      | readerId       |
      | cardUid        |
      | tappedAt       |
      | outcome        |
      | displayMessage |
