# language: es
@acceptance
Característica: Control de acceso a áreas restringidas y permisos personalizados
  Como administrador,
  quiero que el lector muestre un mensaje cuando alguien intenta entrar a un área restringida
  y poder personalizar los permisos de cada tarjeta,
  para garantizar que solo ingresen las personas autorizadas.

  Antecedentes:
    Dado que inicié sesión como "administrador"
    Y que estoy en el simulador de lector NFC

  @US12
  Escenario: Un estudiante sin permiso no puede entrar a la Sala de Servidores
    Cuando uso el escenario rápido "Estudiante en Sala de Servidores" y paso la tarjeta
    Entonces el lector muestra "Acceso denegado"
    Y la tabla de registros de acceso muestra el motivo "Sin permiso para el espacio"

  @US12
  Escenario: Nadie puede entrar a un espacio en mantenimiento
    Cuando paso la tarjeta de "T0001" por el lector "RDR-D-004"
    Entonces el lector muestra "Acceso denegado"
    Y la tabla de registros de acceso muestra el motivo "Espacio en mantenimiento"

  @US14
  Escenario: La excepción de la tarjeta tiene prioridad sobre los roles del espacio
    Cuando paso la tarjeta de "U202312966" por el lector "RDR-D-002"
    Entonces el lector muestra "Acceso concedido"
    Y la Fake API guarda la lectura de "U202312966" en "RDR-D-002" con resultado "ACCESS"
