/** Traduce entre recursos (DTO de la API) y entidades del dominio. */
export interface BaseAssembler<TEntity, TResource> {
  toEntityFromResource(resource: TResource): TEntity;
  toResourceFromEntity(entity: TEntity): TResource;
}

export function toEntities<TEntity, TResource>(
  assembler: BaseAssembler<TEntity, TResource>,
  resources: TResource[],
): TEntity[] {
  return resources.map((r) => assembler.toEntityFromResource(r));
}
