# language: es
@acceptance
Característica: Gestión del ciclo de vida de las credenciales NFC
  Como administrador,
  quiero dar de baja, reactivar y vincular las tarjetas con la base de datos de titulares,
  para gestionar fácilmente su estado y asegurar que solo las personas habilitadas usen los servicios.

  Antecedentes:
    Dado que inicié sesión como "administrador"

  @US10
  Escenario: Dar de baja la tarjeta de un estudiante retirado
    Dado que abrí la credencial de "U202310959"
    Cuando doy de baja la tarjeta por "Retiro de la universidad" con el detalle "Retiro formal del ciclo 2026-2"
    Entonces la tarjeta queda en estado "Desactivada"
    Y el historial de estados registra el motivo "Retiro de la universidad"
    Y la Fake API guarda la credencial de "U202310959" con estado "DEACTIVATED"

  @US10
  Escenario: Una tarjeta dada de baja ya no funciona en los lectores
    Dado que estoy en el simulador de lector NFC
    Cuando paso la tarjeta de "U202310959" por el lector "RDR-T-001"
    Entonces el lector muestra "Tarjeta inactiva. Acércate a servicios universitarios"

  @US13
  Escenario: Reactivar una tarjeta bloqueada
    Dado que abrí la credencial de "U202310822"
    Cuando ejecuto la acción "Bloquear" con el motivo "Bloqueo preventivo por revisión"
    Entonces la tarjeta queda en estado "Bloqueada"
    Cuando ejecuto la acción "Reactivar"
    Entonces veo el mensaje "reactivada"
    Y la tarjeta queda en estado "Activa"
    Y la Fake API guarda la credencial de "U202310822" con estado "ACTIVE"

  @US13
  Escenario: No se reactiva la tarjeta de un estudiante con matrícula pendiente
    Dado que abrí la credencial de "U202413151"
    Cuando ejecuto la acción "Reactivar"
    Entonces veo el mensaje "No se puede reactivar: la matrícula del estudiante está pendiente."
    Y la Fake API guarda la credencial de "U202413151" con estado "DEACTIVATED"

  @US11
  Escenario: Un código de titular que no existe no se puede vincular
    Dado que abrí la credencial sin titular "cred-054"
    Cuando busco al titular con código "U999" para vincularlo
    Entonces veo el mensaje "Titular no encontrado"

  @US11
  Escenario: Un titular solo puede tener una tarjeta activa
    Dado que abrí la credencial sin titular "cred-054"
    Cuando busco al titular con código "U202312966" para vincularlo
    Y confirmo la vinculación
    Entonces veo el mensaje "El titular ya tiene una tarjeta activa (04:3D:9B:12:8F)"
