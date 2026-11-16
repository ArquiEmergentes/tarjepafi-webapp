export const environment = {
  /** Backend (Spring Boot). Contexts already migrated talk to it. Locally the backend may run on 8081. */
  apiBaseUrl: 'http://localhost:8080/api/v1',
  /** json-server, still used by every context that has not been migrated yet (removed in backend phase 7). */
  legacyApiBaseUrl: 'http://localhost:3000/api/v1',
  /** Hora simulada con la que arranca la demo (miércoles de la semana de datos simulados). */
  initialSimulatedTime: '2026-10-07T09:50:00',
};
