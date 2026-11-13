import { Page, expect } from '@playwright/test';
import { FakeApi, Given, Then, When } from './fixtures';

async function openSimulator(page: Page): Promise<void> {
  if (!page.url().endsWith('/admin/simulator')) await page.goto('/admin/simulator');
  await expect(page.getByRole('button', { name: 'Pasar tarjeta' })).toBeVisible();
}

async function tap(page: Page, readerId: string, cardUid: string): Promise<void> {
  await openSimulator(page);
  await page.getByRole('combobox', { name: 'Lector' }).click();
  await page.getByRole('option', { name: new RegExp(`^${readerId} ·`) }).click();
  const card = page.getByRole('combobox', { name: 'Tarjeta' });
  await card.fill(cardUid);
  await card.press('Escape');
  await submitTap(page);
  await expect(page.locator('.screen-time')).toContainText(readerId);
}

/** Pulsa "Pasar tarjeta" y espera a que la Web App registre el cardTapEvent en la Fake API. */
async function submitTap(page: Page): Promise<void> {
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/cardTapEvents'));
  await page.getByRole('button', { name: 'Pasar tarjeta' }).click();
  await saved;
  await expect(page.getByRole('button', { name: 'Pasar tarjeta' })).toBeEnabled();
}

async function tapHolder(page: Page, api: FakeApi, code: string, readerId: string): Promise<void> {
  await tap(page, readerId, await api.cardUidOf(code));
}

async function setClock(page: Page, localDateTime: string): Promise<void> {
  await openSimulator(page);
  await page.locator('input[type="datetime-local"]').fill(localDateTime);
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByRole('button', { name: 'Aplicar' })).toBeEnabled();
}

Given('que estoy en el simulador de lector NFC', async ({ page }) => {
  await openSimulator(page);
});

Given('la hora simulada es {string}', async ({ page }, localDateTime: string) => {
  await setClock(page, localDateTime);
});

When('cambio la hora simulada a {string}', async ({ page }, localDateTime: string) => {
  await setClock(page, localDateTime);
});

When('paso la tarjeta de {string} por el lector {string}', async ({ page, api }, code: string, readerId: string) => {
  await tapHolder(page, api, code, readerId);
});

When('paso la tarjeta con UID {string} por el lector {string}', async ({ page }, uid: string, readerId: string) => {
  await tap(page, readerId, uid);
});

When('uso el escenario rápido {string} y paso la tarjeta', async ({ page }, preset: string) => {
  await openSimulator(page);
  await page.getByRole('button', { name: preset, exact: true }).click();
  await submitTap(page);
});

Given(
  'que el docente {string} ya registró su llegada en el lector {string}',
  async ({ page, api }, code: string, readerId: string) => {
    const uid = await api.cardUidOf(code);
    const arrivals = await api.get<unknown[]>(
      `/cardTapEvents?cardUid=${uid}&readerId=${readerId}&tappedAt_like=2026-10-07&displayMessage_like=Llegada registrada`,
    );
    if (arrivals.length === 0) {
      await tap(page, readerId, uid);
      await expect(page.locator('.screen-message')).toContainText('Llegada registrada');
    }
  },
);

Then('el lector muestra {string}', async ({ page }, message: string) => {
  await expect(page.locator('.screen-message')).toHaveText(message);
});

Then('el lector muestra un mensaje que empieza con {string}', async ({ page }, prefix: string) => {
  await expect(page.locator('.screen-message')).toContainText(prefix);
  expect((await page.locator('.screen-message').textContent())?.trim().startsWith(prefix)).toBeTruthy();
});

Then('el lector muestra el titular {string}', async ({ page }, name: string) => {
  await expect(page.locator('.screen-holder')).toHaveText(name);
});

Then(
  'la Fake API guarda la lectura de {string} en {string} con resultado {string}',
  async ({ api }, code: string, readerId: string, outcome: string) => {
    const uid = await api.cardUidOf(code);
    const events = await api.get<{ outcome: string; tappedAt: string }[]>(
      `/cardTapEvents?cardUid=${uid}&readerId=${readerId}`,
    );
    // json-server agrega al final: la última posición es la lectura más reciente.
    expect(events.at(-1)?.outcome).toBe(outcome);
  },
);
