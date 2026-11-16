import { defineConfig, devices } from '@playwright/test';
import { cucumberReporter, defineBddConfig } from 'playwright-bdd';

/**
 * Tests BDD de TarjePAFI (Gherkin + Playwright).
 * - features/integration: Integration Tests contra la Fake API (json-server, /api/v1).
 * - features/acceptance: Acceptance Tests que usan la aplicación web como el administrador o el docente.
 *
 * Los escenarios comparten una base de datos que se regenera en cada ejecución, por eso corren en orden
 * (1 worker, archivos numerados) y la hora simulada vuelve al miércoles 07/10/2026 09:50 en cada escenario.
 */
const testDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: 'e2e/steps/**/*.ts',
  language: 'es',
});

export default defineConfig({
  testDir,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    cucumberReporter('html', { outputFile: 'cucumber-report/index.html' }),
    cucumberReporter('json', { outputFile: 'cucumber-report/report.json' }),
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4200',
    locale: 'es-PE',
    viewport: { width: 1440, height: 900 },
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    // Primero los servicios web (datos recién generados), luego los flujos de usuario que modifican la base.
    { name: 'integration', testMatch: '**/integration/**' },
    { name: 'acceptance', testMatch: '**/acceptance/**', dependencies: ['integration'] },
  ],
  webServer: [
    {
      command: 'node e2e/support/start-test-api.mjs',
      url: 'http://localhost:3000/api/v1/settings',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npx ng serve --port 4200',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
