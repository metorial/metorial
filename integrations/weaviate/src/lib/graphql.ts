import { createApiServiceError } from 'slates';

// Weaviate filters use a GraphQL enum for operator and strings for values.
export let graphqlValue = (value: unknown, key?: string): string => {
  if (key === 'operator') {
    if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
      throw createApiServiceError('A where filter operator must be a GraphQL enum name.');
    }
    return value;
  }
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(item => graphqlValue(item)).join(', ')}]`;
  if (typeof value === 'object') {
    return `{ ${Object.entries(value)
      .map(([field, item]) => {
        if (!/^[_A-Za-z][_0-9A-Za-z]*$/.test(field)) {
          throw createApiServiceError(`Invalid GraphQL filter field: ${field}.`);
        }
        return `${field}: ${graphqlValue(item, field)}`;
      })
      .join(', ')} }`;
  }
  throw createApiServiceError('A where filter must contain JSON-compatible values.');
};

export let validateCollectionName = (collectionName: string) => {
  if (!/^[_A-Za-z][_0-9A-Za-z]*$/.test(collectionName)) {
    throw createApiServiceError(
      `Invalid GraphQL collection name: ${collectionName}. Use the collection's exact name.`
    );
  }
};

export let validateDistance = (input: { distance?: number; certainty?: number }) => {
  if (input.distance !== undefined && input.certainty !== undefined) {
    throw createApiServiceError('Provide distance or certainty, not both.');
  }
};
