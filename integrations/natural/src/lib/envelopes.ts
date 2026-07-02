export type NaturalRecord = Record<string, any>;

export const isRecord = (value: unknown): value is NaturalRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const pickDefined = <T extends NaturalRecord>(value: T) => {
  const result: NaturalRecord = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) result[key] = item;
  }
  return result;
};

export const jsonApiBody = (
  attributes: NaturalRecord = {},
  relationships?: NaturalRecord
) => ({
  data: pickDefined({
    attributes,
    relationships:
      relationships && Object.keys(relationships).length > 0 ? relationships : undefined
  })
});

export const relationshipData = (type: string, id: string) => ({
  data: {
    type,
    id
  }
});

export const dataOf = (envelope: unknown) => (isRecord(envelope) ? envelope.data : undefined);

export const metaOf = (envelope: unknown) =>
  isRecord(envelope) && isRecord(envelope.meta) ? envelope.meta : {};

export const attributesOf = (resource: unknown) =>
  isRecord(resource) && isRecord(resource.attributes) ? resource.attributes : {};

export const relationshipsOf = (resource: unknown) =>
  isRecord(resource) && isRecord(resource.relationships) ? resource.relationships : {};

export const idOf = (resource: unknown) =>
  isRecord(resource) && typeof resource.id === 'string' ? resource.id : undefined;

export const typeOf = (resource: unknown) =>
  isRecord(resource) && typeof resource.type === 'string' ? resource.type : undefined;

export const listData = (envelope: unknown) => {
  const data = dataOf(envelope);
  return Array.isArray(data) ? data.filter(isRecord) : [];
};

export const singleData = (envelope: unknown) => {
  const data = dataOf(envelope);
  return isRecord(data) ? data : {};
};

export const resourceSummary = (resource: unknown) => {
  const attributes = attributesOf(resource);
  return pickDefined({
    id: idOf(resource),
    type: typeOf(resource),
    name: attributes.name,
    displayName: attributes.displayName,
    email: attributes.email,
    status: attributes.status,
    amount: attributes.amount,
    currency: attributes.currency,
    createdAt: attributes.createdAt,
    updatedAt: attributes.updatedAt
  });
};
