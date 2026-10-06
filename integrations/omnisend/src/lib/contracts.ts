import { AuthConfigSecretRedactor, createApiServiceError } from 'slates';

export type JsonRecord = Record<string, unknown>;
export type OmnisendApiVersion = 'v5' | '2026-03-15';
export type OmnisendAuth = {
  token: string;
  refreshToken?: string;
  authType?: 'api_key' | 'oauth';
  expiresAt?: string;
};

export let invalid = (message: string): never => {
  throw createApiServiceError(message, { reason: 'omnisend_validation', parent: {} });
};

export let record = (value: unknown): JsonRecord => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return invalid(
      'Omnisend returned an invalid object. Completion is unconfirmed; do not automatically retry writes.'
    );
  }
  return value as JsonRecord;
};

export let text = (value: unknown, label = 'value', maximum = 4096): string => {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maximum ||
    [...value].some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  ) {
    return invalid(
      `Provide a nonblank ${label} without control characters and within its documented length limit.`
    );
  }
  return value;
};

export let optionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return invalid('Omnisend returned an invalid text field.');
  return value;
};

export let optionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value))
    return invalid('Omnisend returned an invalid numeric field.');
  return value;
};

export let optionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean')
    return invalid('Omnisend returned an invalid boolean field.');
  return value;
};

export let stringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string'))
    return invalid('Omnisend returned an invalid string array.');
  return value as string[];
};

export let recordArray = (value: unknown): JsonRecord[] => {
  if (!Array.isArray(value)) return invalid('Omnisend returned an invalid resource list.');
  return value.map(record);
};

export let integer = (
  value: unknown,
  label: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER
) => {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  )
    return invalid(`Provide a valid integer ${label} between ${minimum} and ${maximum}.`);
  return value;
};

export let timestamp = (value: unknown) => {
  if (value === undefined) return undefined;
  let result = text(value, 'timestamp');
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    return invalid('Provide an RFC3339 timestamp with a timezone.');
  return result;
};

export let money = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    return invalid(
      'Provide a finite nonnegative monetary amount in currency units; amounts are not converted from cents.'
    );
  return value;
};

export let url = (value: unknown): string => {
  let result = text(value, 'URL', 1000);
  try {
    let parsed = new URL(result);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
      return invalid('Provide an absolute HTTP or HTTPS URL without credentials.');
  } catch {
    return invalid('Provide an absolute HTTP or HTTPS URL without credentials.');
  }
  return result;
};

export let sanitizeResponse = (value: unknown, auth: OmnisendAuth): unknown => {
  let redactor = new AuthConfigSecretRedactor({
    token: auth.token,
    refreshToken: auth.refreshToken
  });
  let visit = (item: unknown): unknown => {
    if (typeof item === 'string')
      return redactor
        .redactEmbedded(item)
        .replace(/\$\$MT\$secret\$authConfig\$[A-Za-z0-9_.]+(?:\$\$)?/g, '[redacted]');
    if (Array.isArray(item)) return item.map(visit);
    if (item !== null && typeof item === 'object') {
      return Object.fromEntries(
        Object.entries(item)
          .filter(
            ([key]) =>
              redactor.redactEmbedded(key) === key &&
              !/^(?:access[_-]?token|refresh[_-]?token|token|api[_-]?key|authorization|client[_-]?secret|password)$/i.test(
                key
              )
          )
          .map(([key, nested]) => [key, visit(nested)])
      );
    }
    return item;
  };
  return visit(value);
};

export let responseId = (value: unknown): string => {
  let result = text(value, 'provider resource ID');
  if (result.includes('[redacted]'))
    return invalid(
      'Omnisend returned an unsafe resource identity. Completion is unconfirmed; do not automatically retry writes.'
    );
  return result;
};

export let mapContact = (value: unknown) => {
  let item = record(value);
  let identifiers = item.identifiers === undefined ? undefined : recordArray(item.identifiers);
  let email = identifiers?.find(identifier => identifier.type === 'email');
  let phones = identifiers
    ?.filter(identifier => identifier.type === 'phone')
    .map(identifier => text(identifier.id, 'phone identifier'));
  let channel = email?.channels === undefined ? undefined : record(email.channels);
  let emailChannel = channel?.email === undefined ? undefined : record(channel.email);
  return {
    contactId: responseId(item.contactID ?? item.id),
    email: optionalText(item.email ?? email?.id),
    firstName: optionalText(item.firstName),
    lastName: optionalText(item.lastName),
    phone: item.phone === undefined ? phones : stringArray(item.phone),
    status: optionalText(item.status ?? emailChannel?.status),
    address: optionalText(item.address),
    city: optionalText(item.city),
    state: optionalText(item.state),
    postalCode: optionalText(item.postalCode),
    country: optionalText(item.country),
    countryCode: optionalText(item.countryCode),
    birthdate: optionalText(item.birthdate),
    gender: optionalText(item.gender),
    tags: stringArray(item.tags),
    customProperties:
      item.customProperties == null ? undefined : record(item.customProperties),
    identifiers,
    createdAt: optionalText(item.createdAt),
    updatedAt: optionalText(item.updatedAt)
  };
};

export let mapProduct = (value: unknown) => {
  let item = record(value);
  return {
    productId: responseId(item.id),
    title: optionalText(item.title),
    url: optionalText(item.url),
    currency: optionalText(item.currency),
    status: optionalText(item.status),
    description: optionalText(item.description),
    defaultImageUrl: optionalText(item.defaultImageUrl),
    vendor: optionalText(item.vendor),
    type: optionalText(item.type),
    tags: stringArray(item.tags),
    images: stringArray(item.images),
    categoryIds: stringArray(item.categoryIDs),
    createdAt: optionalText(item.createdAt),
    updatedAt: optionalText(item.updatedAt),
    variants:
      item.variants == null
        ? undefined
        : recordArray(item.variants).map(variant => ({
            variantId: responseId(variant.id),
            title: optionalText(variant.title),
            price: optionalNumber(variant.price),
            sku: optionalText(variant.sku),
            status: optionalText(variant.status),
            url: optionalText(variant.url),
            description: optionalText(variant.description),
            defaultImageUrl: optionalText(variant.defaultImageUrl),
            images: stringArray(variant.images),
            strikeThroughPrice: optionalNumber(variant.strikeThroughPrice)
          }))
  };
};

export let mapCategory = (value: unknown) => {
  let item = record(value);
  return {
    categoryId: responseId(item.id ?? item.categoryID),
    title: optionalText(item.title),
    createdAt: optionalText(item.createdAt),
    updatedAt: optionalText(item.updatedAt)
  };
};
