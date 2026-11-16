import { APIRequestContext, expect } from '@playwright/test';
import { createBdd, test as base } from 'playwright-bdd';

export const API = 'http://localhost:3000/api/v1';

/** Estado que comparten los steps de un mismo escenario. */
export interface ScenarioContext {
  response?: { status: number; body: unknown };
  createdReaderId?: string;
}

/** Acceso de solo lectura a la Fake API para preparar datos y verificar lo que registró la aplicación. */
export class FakeApi {
  constructor(private readonly request: APIRequestContext) {}

  async get<T>(path: string): Promise<T> {
    const res = await this.request.get(`${API}${path}`);
    expect(res.ok(), `GET ${path}`).toBeTruthy();
    return (await res.json()) as T;
  }

  async holderByCode(code: string): Promise<{ id: string; code: string; fullName: string }> {
    const [holder] = await this.get<{ id: string; code: string; fullName: string }[]>(`/cardHolders?code=${code}`);
    expect(holder, `titular ${code}`).toBeTruthy();
    return holder;
  }

  /** UID de la tarjeta ACTIVE del titular (o de la más reciente si no tiene una activa). */
  async cardUidOf(code: string): Promise<string> {
    const holder = await this.holderByCode(code);
    const cards = await this.get<{ cardUid: string; status: string }[]>(`/credentials?cardHolderId=${holder.id}`);
    return (cards.find((c) => c.status === 'ACTIVE') ?? cards[cards.length - 1]).cardUid;
  }
}

export const test = base.extend<{ ctx: ScenarioContext; api: FakeApi }>({
  ctx: async ({}, use) => use({}),
  api: async ({ request }, use) => use(new FakeApi(request)),
});

export const { Given, When, Then } = createBdd(test);
