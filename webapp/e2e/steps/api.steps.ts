import { expect } from '@playwright/test';
import { DataTable } from 'playwright-bdd';
import { API, Given, Then, When } from './fixtures';

type Json = Record<string, unknown>;

function field(item: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc as Json | undefined)?.[key], item);
}

Given('que la Fake API de TarjePAFI está disponible', async ({ request }) => {
  const res = await request.get(`${API}/settings`);
  expect(res.status()).toBe(200);
});

When('consulto el recurso {string}', async ({ request, ctx }, path: string) => {
  const res = await request.get(`${API}${path}`);
  ctx.response = { status: res.status(), body: res.status() === 200 ? await res.json() : null };
});

When('registro un lector con el cuerpo:', async ({ request, ctx }, docString: string) => {
  const body = JSON.parse(docString) as Json;
  const res = await request.post(`${API}/readers`, { data: body });
  ctx.response = { status: res.status(), body: await res.json() };
  ctx.createdReaderId = body['id'] as string;
});

When('actualizo el lector {string} con:', async ({ request, ctx }, id: string, docString: string) => {
  const res = await request.patch(`${API}/readers/${id}`, { data: JSON.parse(docString) });
  ctx.response = { status: res.status(), body: await res.json() };
});


Then('la respuesta tiene el código HTTP {int}', async ({ ctx }, status: number) => {
  expect(ctx.response?.status).toBe(status);
});

Then('la respuesta es una lista con {int} elemento(s)', async ({ ctx }, count: number) => {
  expect(Array.isArray(ctx.response?.body)).toBeTruthy();
  expect((ctx.response?.body as unknown[]).length).toBe(count);
});

Then('la respuesta es una lista no vacía', async ({ ctx }) => {
  expect((ctx.response?.body as unknown[]).length).toBeGreaterThan(0);
});

Then('el campo {string} es {string}', async ({ ctx }, path: string, value: string) => {
  const body = ctx.response?.body;
  const item = Array.isArray(body) ? body[0] : body;
  expect(String(field(item, path))).toBe(value);
});

Then('todos los elementos tienen el campo {string} igual a {string}', async ({ ctx }, path: string, value: string) => {
  for (const item of ctx.response?.body as unknown[]) expect(String(field(item, path))).toBe(value);
});

Then('cada elemento incluye los campos:', async ({ ctx }, dataTable: DataTable) => {
  const fields = dataTable.raw().map((row) => row[0]);
  const body = ctx.response?.body;
  for (const item of Array.isArray(body) ? body : [body]) {
    for (const f of fields) expect(item as Json, `campo ${f}`).toHaveProperty(f.split('.'));
  }
});
