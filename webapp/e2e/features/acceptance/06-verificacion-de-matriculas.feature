# language: es
@acceptance
Característica: Desactivación automática de tarjetas por matrícula no completada
  Como administrador,
  quiero que las tarjetas se desactiven automáticamente si un estudiante no completa su matrícula a tiempo,
  para mantener la seguridad.

  Antecedentes:
    Dado que inicié sesión como "administrador"

  @US15
  Escenario: Vencido el plazo, se desactivan solo las tarjetas activas con matrícula pendiente
    Cuando ejecuto la verificación de matrículas
    Entonces el resultado indica "5 desactivadas"
    Y la tarjeta de "U202310685" aparece entre las desactivadas
    Y la Fake API guarda la credencial de "U202310685" con estado "DEACTIVATED"
    Y la Fake API guarda la credencial de "U202312966" con estado "ACTIVE"

  @US15
  Escenario: El historial registra el motivo y que el cambio lo hizo el sistema
    Dado que abrí la credencial de "U202310685"
    Entonces la tarjeta queda en estado "Desactivada"
    Y el historial de estados registra el motivo "Matrícula no completada"
    Y el historial de estados registra el autor "Sistema"
