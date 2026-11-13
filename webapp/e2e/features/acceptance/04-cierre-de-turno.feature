# language: es
@acceptance
Característica: Cierre de turno del trabajador
  Como trabajador,
  quiero que la tarjeta sirva como herramienta de registro de salida del trabajo,
  para llevar un registro exacto de mis horas trabajadas.

  Antecedentes:
    Dado que inicié sesión como "administrador"
    Y que estoy en el simulador de lector NFC

  @US24
  Escenario: Con la jornada abierta, una nueva entrada no abre otra jornada
    Cuando paso la tarjeta de "T0001" por el lector "RDR-T-001"
    Entonces el lector muestra "Tu jornada ya está abierta"

  @US24
  Escenario: La salida cierra la jornada y muestra las horas trabajadas
    Cuando uso el escenario rápido "Trabajador en salida" y paso la tarjeta
    Entonces el lector muestra un mensaje que empieza con "Salida registrada ·"
    Y la Fake API guarda la lectura de "T0001" en "RDR-T-003" con resultado "WORK_SHIFT"
    Cuando paso la tarjeta de "T0001" por el lector "RDR-T-003"
    Entonces el lector muestra "Tu salida ya fue registrada"
