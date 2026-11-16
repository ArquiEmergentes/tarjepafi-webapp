import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';

const DEMO_USERS: Record<string, { email: string; password: string }> = {
  administrador: { email: 'admin@upc.edu.pe', password: 'Admin123*' },
  docente: { email: 'docente@upc.edu.pe', password: 'Docente123*' },
};

Given('que inicié sesión como {string}', async ({ page }, role: string) => {
  const user = DEMO_USERS[role];
  await page.goto('/login');
  await page.getByLabel('Correo institucional').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).not.toHaveURL(/\/login/);
});

When('voy a la página {string}', async ({ page }, path: string) => {
  await page.goto(path);
});

When('confirmo la acción en el diálogo', async ({ page }) => {
  const dialog = page.getByRole('dialog');
  await dialog.locator('mat-dialog-actions button').last().click();
  await expect(dialog).toBeHidden();
});

Then('veo el mensaje {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
});
