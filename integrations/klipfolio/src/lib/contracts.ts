import { createApiServiceError, isApiErrorRecord } from 'slates';

export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });

export const pathId = (value: string) => {
  if (
    !value.trim() ||
    value === '.' ||
    value === '..' ||
    /[\s/\\?#%]/.test(value) ||
    [...value].some(character => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    }) ||
    /[\uD800-\uDFFF]/u.test(value)
  )
    throw invalid(
      'Resource IDs must be nonempty valid Unicode identifiers, without control, URL path or query characters.'
    );
  return encodeURIComponent(value);
};

export const klipSchema = (value: unknown): Record<string, unknown> => {
  // Accept the wrapper emitted by the historical get tool as well as the documented definition.
  const schema =
    isApiErrorRecord(value) &&
    Object.keys(value).length === 1 &&
    isApiErrorRecord(value.schema)
      ? value.schema
      : value;
  if (!isApiErrorRecord(schema))
    throw invalid('Klip schema must be a JSON object definition.');
  return schema;
};

// Preserve established number schemas; validate API integer requirements at invocation time.
export const validateInput = (input: Record<string, unknown>) => {
  for (const [add, remove] of [
    ['addUserIds', 'removeUserIds'],
    ['addToGroupIds', 'removeFromGroupIds']
  ] as const) {
    const adding = input[add];
    const removing = input[remove];
    if (
      Array.isArray(adding) &&
      Array.isArray(removing) &&
      adding.some(id => removing.includes(id))
    )
      throw invalid('The same resource cannot be added and removed in one invocation.');
  }
  if (
    Array.isArray(input.shareRights) &&
    Array.isArray(input.removeShareRightGroupIds) &&
    input.shareRights.some(
      right =>
        isApiErrorRecord(right) &&
        (input.removeShareRightGroupIds as unknown[]).includes(right.groupId)
    )
  )
    throw invalid('The same group cannot receive and lose sharing rights in one invocation.');
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if ((/Id$/.test(key) && key !== 'externalId') || key === 'enable' || key === 'disable')
      pathId(String(value));
    if (/Ids$/.test(key) && Array.isArray(value)) for (const id of value) pathId(String(id));
    if (key === 'roles' && Array.isArray(value)) for (const id of value) pathId(String(id));
    if (
      key === 'permissions' &&
      Array.isArray(value) &&
      value.some(permission => typeof permission !== 'string' || !permission.trim())
    )
      throw invalid('Permission strings must not be blank.');
    if (
      ['name', 'firstName', 'lastName', 'email', 'connector'].includes(key) &&
      typeof value === 'string' &&
      !value.trim()
    )
      throw invalid(`${key} must not be blank.`);
    if (
      ['limit', 'offset', 'refreshInterval', 'region', 'position', 'index', 'seats'].includes(
        key
      )
    ) {
      const min = key === 'limit' ? 1 : key === 'seats' ? -1 : 0;
      if (
        typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < min ||
        (key === 'limit' && value > 100) ||
        (key === 'refreshInterval' && value > 0 && value < 60)
      )
        throw invalid(
          `${key} must be a valid integer${key === 'limit' ? ' from 1 to 100' : key === 'refreshInterval' ? ': 0 disables scheduled refresh; positive intervals must be at least 60 seconds' : ` of at least ${min}`}.`
        );
    }
    if (Array.isArray(value) && !/Ids$/.test(key))
      for (const item of value) if (isApiErrorRecord(item)) validateInput(item);
    if (
      key === 'layout' &&
      isApiErrorRecord(value) &&
      (typeof value.type !== 'string' || !value.type.trim())
    )
      throw invalid('Layout type must not be blank.');
  }
};

export const createdId = (result: unknown, collection: string): string => {
  if (!isApiErrorRecord(result))
    throw invalid(
      'The API did not return a created resource identifier. Check for a newly created resource before retrying.'
    );
  const data = isApiErrorRecord(result.data) ? result.data : {};
  if (typeof data.id === 'string') {
    pathId(data.id);
    return data.id;
  }
  const meta = isApiErrorRecord(result.meta) ? result.meta : {};
  if (typeof meta.location === 'string') {
    let url: URL;
    try {
      url = new URL(meta.location, 'https://app.klipfolio.com');
    } catch {
      throw createApiServiceError(
        'Klipfolio returned an invalid creation location. Read back the resource before retrying.',
        { reason: 'invalid_response' }
      );
    }
    const match = url.pathname.match(new RegExp(`(?:^|/)${collection}/([^/]+)$`));
    if (
      url.origin === 'https://app.klipfolio.com' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      match?.[1]
    ) {
      pathId(match[1]);
      return match[1];
    }
  }
  throw createApiServiceError(
    'Klipfolio accepted creation without a usable resource ID. Check the resource list before retrying; an object may already exist.',
    { reason: 'invalid_response' }
  );
};
