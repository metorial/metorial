import { createApiServiceError } from 'slates';

export let normalizeHttpsOrigin = (value: string, field: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(
      `${field} is missing. Reconnect with the required HTTPS origin.`,
      { reason: 'oracle_fusion_invalid_origin' }
    );
  }
  let input = value.trim();
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw createApiServiceError(
      `${field} must be an HTTPS origin, such as https://example.oraclecloud.com.`,
      { reason: 'oracle_fusion_invalid_origin' }
    );
  }
  if (
    !/^https:\/\/[^/?#\s]+\/?$/i.test(input) ||
    url.protocol !== 'https:' ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw createApiServiceError(
      `${field} must be an HTTPS origin without credentials, a path, a query, or a fragment.`,
      { reason: 'oracle_fusion_invalid_origin' }
    );
  }
  return url.origin;
};

export let hasControlCharacters = (value: string) =>
  [...value].some(character => {
    let code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

export let encodeResourceKey = (value: string) => {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 2048 ||
    value === '.' ||
    value === '..' ||
    /[/\\]/.test(value) ||
    hasControlCharacters(value)
  ) {
    throw createApiServiceError(
      'A resource key must be a nonempty identifier returned by the corresponding list or get tool.',
      { reason: 'oracle_fusion_invalid_resource_key' }
    );
  }
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('The resource key contains unsupported characters.', {
      reason: 'oracle_fusion_invalid_resource_key'
    });
  }
};
