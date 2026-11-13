import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';

Given('que abrí la credencial de {string}', async ({ page, api }, code: string) => {
  const holder = await api.holderByCode(code);
  const cards = await api.get<{ id: string; status: string }[]>(`/credentials?cardHolderId=${holder.id}`);
  await page.goto(`/admin/credentials/${cards[cards.length - 1].id}`);
  await expect(page.getByRole('heading', { name: holder.fullName })).toBeVisible();
});

Given('que abrí la credencial sin titular {string}', async ({ page }, credentialId: string) => {
  await page.goto(`/admin/credentials/${credentialId}`);
  await expect(page.getByText('Esta tarjeta no tiene titular')).toBeVisible();
});

When('ejecuto la acción {string} con el motivo {string}', async ({ page }, action: string, note: string) => {
  await page.getByRole('button', { name: action }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('textarea').fill(note);
  await dialog.locator('mat-dialog-actions button').last().click();
  await expect(dialog).toBeHidden();
});

When('ejecuto la acción {string}', async ({ page }, action: string) => {
  await page.getByRole('button', { name: action }).first().click();
  await page.getByRole('dialog').locator('mat-dialog-actions button').last().click();
});

When('doy de baja la tarjeta por {string} con el detalle {string}', async ({ page }, reason: string, note: string) => {
  await page.getByRole('button', { name: 'Dar de baja' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: reason }).check();
  await dialog.locator('textarea').fill(note);
  await dialog.locator('mat-dialog-actions button').last().click();
  await expect(dialog).toBeHidden();
});

When('busco al titular con código {string} para vincularlo', async ({ page }, code: string) => {
  await page.getByRole('button', { name: /Vincular titular|Actualizar titular/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Código del titular').fill(code);
  await dialog.getByRole('button', { name: 'Buscar' }).click();
});

When('confirmo la vinculación', async ({ page }) => {
  await page.getByRole('dialog').getByRole('button', { name: 'Vincular', exact: true }).click();
});

Then('la tarjeta queda en estado {string}', async ({ page }, status: string) => {
  const statusRow = page.locator('dl > div').filter({ has: page.locator('dt', { hasText: /^Estado$/ }) });
  await expect(statusRow.locator('dd')).toContainText(status);
});

Then('el historial de estados registra el motivo {string}', async ({ page }, reason: string) => {
  await expect(page.locator('.history table')).toContainText(reason);
});

Then('el historial de estados registra el autor {string}', async ({ page }, actor: string) => {
  await expect(page.locator('.history table')).toContainText(actor);
});

Then('la Fake API guarda la credencial de {string} con estado {string}', async ({ api }, code: string, status: string) => {
  const holder = await api.holderByCode(code);
  const cards = await api.get<{ status: string }[]>(`/credentials?cardHolderId=${holder.id}`);
  expect(cards.at(-1)?.status).toBe(status);
});

When('ejecuto la verificación de matrículas', async ({ page }) => {
  await page.goto('/admin/enrollment-check');
  await page.getByRole('button', { name: 'Ejecutar verificación' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('mat-dialog-actions button').last().click();
  await expect(dialog).toBeHidden();
});

Then('el resultado indica {string}', async ({ page }, text: string) => {
  await expect(page.locator('.result-line')).toContainText(text);
});

Then('la tarjeta de {string} aparece entre las desactivadas', async ({ page, api }, code: string) => {
  const uid = await api.cardUidOf(code);
  await expect(page.locator('.result table')).toContainText(uid);
});

Then('la tabla de registros de acceso muestra el motivo {string}', async ({ page }, reason: string) => {
  await page.goto('/admin/access-records');
  await expect(page.locator('table').first()).toContainText(reason);
});
