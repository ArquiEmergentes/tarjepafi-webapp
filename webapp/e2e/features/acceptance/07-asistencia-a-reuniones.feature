# language: es
@acceptance
Característica: Registro de asistencia del docente a reuniones y capacitaciones
  Como profesor,
  quiero que mi tarjeta me permita marcar mi asistencia a reuniones o capacitaciones,
  para llevar un control integral de mi tiempo.

  Antecedentes:
    Dado que inicié sesión como "administrador"
    Y que estoy en el simulador de lector NFC
    Y la hora simulada es "2026-10-08T15:58"

  @US21
  Escenario: Un docente convocado registra su asistencia a la capacitación
    Cuando paso la tarjeta de "D0001" por el lector "RDR-D-005"
    Entonces el lector muestra "Asistencia registrada · Capacitación: uso de lectores NFC en aula"
    Y la Fake API guarda la lectura de "D0001" en "RDR-D-005" con resultado "ATTENDANCE"

  @US21
  Escenario: Un docente que no fue convocado no registra asistencia
    Cuando paso la tarjeta de "D0004" por el lector "RDR-D-005"
    Entonces el lector muestra "No estás convocado a esta reunión"
