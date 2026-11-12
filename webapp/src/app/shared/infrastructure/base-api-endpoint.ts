import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BaseAssembler } from './base-assembler';

export interface BaseResource {
  id: string;
}

export type QueryValue = string | number | boolean | null | readonly (string | number)[];
export type Query = Record<string, QueryValue | undefined>;

export function toHttpParams(query: Query = {}): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params = params.append(key, String(v));
    } else {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/**
 * Endpoint CRUD genérico sobre una colección de json-server.
 * Cada bounded context lo extiende con su recurso, su entidad y su assembler.
 */
export abstract class BaseApiEndpoint<TEntity extends { id: string }, TResource extends BaseResource> {
  protected readonly endpointUrl: string;

  protected constructor(
    protected readonly http: HttpClient,
    collection: string,
    protected readonly assembler: BaseAssembler<TEntity, TResource>,
  ) {
    this.endpointUrl = `${environment.apiBaseUrl}/${collection}`;
  }

  getAll(query?: Query): Observable<TEntity[]> {
    return this.http
      .get<TResource[]>(this.endpointUrl, { params: toHttpParams(query) })
      .pipe(map((list) => list.map((r) => this.assembler.toEntityFromResource(r))));
  }

  getById(id: string): Observable<TEntity> {
    return this.http
      .get<TResource>(`${this.endpointUrl}/${encodeURIComponent(id)}`)
      .pipe(map((r) => this.assembler.toEntityFromResource(r)));
  }

  create(entity: TEntity): Observable<TEntity> {
    return this.http
      .post<TResource>(this.endpointUrl, this.assembler.toResourceFromEntity(entity))
      .pipe(map((r) => this.assembler.toEntityFromResource(r)));
  }

  update(entity: TEntity): Observable<TEntity> {
    return this.http
      .put<TResource>(`${this.endpointUrl}/${encodeURIComponent(entity.id)}`, this.assembler.toResourceFromEntity(entity))
      .pipe(map((r) => this.assembler.toEntityFromResource(r)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpointUrl}/${encodeURIComponent(id)}`);
  }
}
