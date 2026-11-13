# language: es
@acceptance
Característica: Registro y confirmación de asistencia estudiantil con el lector NFC
  Como estudiante,
  quiero pasar mi tarjeta por el lector al entrar al salón y ver la confirmación con el horario de la clase,
  para que mi asistencia se registre automáticamente y sepa que quedó registrada.

  Antecedentes:
    Dado que inicié sesión como "administrador"
    Y que estoy en el simulador de lector NFC

  @US01 @US02 @US04
  Escenario: Un estudiante matriculado registra su asistencia y ve el curso y el horario
    Cuando uso el escenario rápido "Estudiante en A-301" y paso la tarjeta
    Entonces el lector muestra "Asistencia tomada · Aplicaciones Web · 10:00–11:30"
    Y el lector muestra el titular "Javier Gonzales Paredes"
    Y la Fake API guarda la lectura de "U202312966" en "RDR-A-301" con resultado "ATTENDANCE"

  @US01
  Escenario: La asistencia no se registra dos veces en la misma sesión
    Cuando paso la tarjeta de "U202311233" por el lector "RDR-A-301"
    Y paso la tarjeta de "U202311233" por el lector "RDR-A-301"
    Entonces el lector muestra "Tu asistencia ya fue registrada"

  @US01
  Escenario: Un estudiante que no está matriculado en la clase no registra asistencia
    Cuando paso la tarjeta de "U202310137" por el lector "RDR-A-301"
    Entonces el lector muestra "No estás matriculado en esta clase"
    Y la Fake API guarda la lectura de "U202310137" en "RDR-A-301" con resultado "REJECTED"

  @US04
  Escenario: Si el aula no tiene una clase en su horario, el lector lo indica
    # El Aula A-303 tiene clase de 13:00 a 14:30; a las 09:50 está fuera de la ventana de marcación.
    Cuando paso la tarjeta de "U202310411" por el lector "RDR-A-303"
    Entonces el lector muestra "No hay una clase en curso en esta aula"

  @US01
  Escenario: Un UID que no está registrado es rechazado
    Cuando paso la tarjeta con UID "04:FF:12:AB:90" por el lector "RDR-A-301"
    Entonces el lector muestra "Tarjeta no registrada"
