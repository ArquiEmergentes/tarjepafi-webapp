# language: es
@acceptance
Característica: Llegada, salida y duración de la clase del docente
  Como profesor,
  quiero que al pasar mi tarjeta al inicio de la clase se registre mi llegada y se confirmen las asistencias
  de los estudiantes, y que al pasarla de nuevo se registre mi salida con la duración de la clase,
  para ahorrar tiempo en la toma de asistencia y llevar el control de mis horas de trabajo.

  Antecedentes:
    Dado que inicié sesión como "administrador"
    Y que estoy en el simulador de lector NFC

  @US16 @US18 @US22
  Escenario: La llegada del docente confirma las asistencias pendientes de sus estudiantes
    Cuando paso la tarjeta de "U202311644" por el lector "RDR-A-301"
    Y uso el escenario rápido "Docente en A-301" y paso la tarjeta
    Entonces el lector muestra un mensaje que empieza con "Llegada registrada · Aplicaciones Web – Desarrollo de Software ·"
    Y el lector muestra el titular "Carlos Mendoza Ríos"
    Y la Fake API guarda la lectura de "D0001" en "RDR-A-301" con resultado "ATTENDANCE"

  @US22
  Escenario: Un docente sin clase asignada en el aula no registra su llegada
    Cuando paso la tarjeta de "D0004" por el lector "RDR-A-301"
    Entonces el lector muestra "No tienes una clase asignada en esta aula a esta hora"

  @US17 @US18 @US23
  Escenario: La segunda pasada del docente registra su salida y la duración de la clase
    Dado que el docente "D0001" ya registró su llegada en el lector "RDR-A-301"
    Cuando cambio la hora simulada a "2026-10-07T11:20"
    Y paso la tarjeta de "D0001" por el lector "RDR-A-301"
    Entonces el lector muestra "Salida registrada · Duración 1 h 30 min"

  @US18
  Escenario: Una tercera pasada no vuelve a registrar la salida
    Dado que el docente "D0001" ya registró su llegada en el lector "RDR-A-301"
    Cuando cambio la hora simulada a "2026-10-07T11:25"
    Y paso la tarjeta de "D0001" por el lector "RDR-A-301"
    Entonces el lector muestra "Tu salida ya fue registrada"
