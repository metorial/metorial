import { createApiServiceError } from 'slates';

export let normalizeBaseUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim())
    throw createApiServiceError(
      'Enter the HTTPS API base URL supplied by your Borneo deployment when connecting the account.'
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('The Borneo API base URL must be an absolute HTTPS URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw createApiServiceError(
      'Use an HTTPS Borneo API base URL without embedded credentials, query parameters, or a fragment.'
    );
  return url.toString().replace(/\/+$/, '');
};

let credentialKey =
  /^(?:authorization|api[-_]?(?:key|token)|auth[-_]?token|private[-_]?key|secret[-_]?access[-_]?key|access[-_]?key[-_]?id|session[-_]?token|access[-_]?token|refresh[-_]?token|token|secret|password|client[-_]?secret|x-amz-(?:signature|credential|security-token)|x-goog-(?:signature|credential|security-token)|awsaccesskeyid|googleaccessid|key-pair-id|policy|signature|sig)$/i;
export function redact<T>(value: T, token: string): T {
  if (typeof value === 'string') {
    let result: string = value;
    for (let secret of token ? [token, encodeURIComponent(token)] : [])
      result = result.split(secret).join('[REDACTED]');
    result = result.replace(
      /([?&](?:api[-_]?(?:key|token)|auth[-_]?token|private[-_]?key|secret[-_]?access[-_]?key|access[-_]?key[-_]?id|session[-_]?token|access[-_]?token|refresh[-_]?token|token|secret|password|client[-_]?secret|x-amz-(?:signature|credential|security-token)|x-goog-(?:signature|credential|security-token)|awsaccesskeyid|googleaccessid|key-pair-id|policy|signature|sig)=)[^&#\s]*/gi,
      '$1[REDACTED]'
    );
    return result as T;
  }
  if (Array.isArray(value)) return value.map(item => redact(item, token)) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        credentialKey.test(key) && item !== null ? '[REDACTED]' : redact(item, token)
      ])
    ) as T;
  return value;
}
export let requireRecord = (data: unknown): Record<string, any> => {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw createApiServiceError(
      'Borneo returned an invalid response: an object was expected.'
    );
  return data;
};
export let readList = (data: unknown, key: string): any[] => {
  if (Array.isArray(data)) return data;
  let record = requireRecord(data);
  for (let candidate of [key, 'content', 'items']) {
    if (Object.hasOwn(record, candidate)) {
      if (!Array.isArray(record[candidate]))
        throw createApiServiceError(`Borneo returned an invalid ${key} list.`);
      return record[candidate];
    }
  }
  throw createApiServiceError(`Borneo did not return the expected ${key} list.`);
};
export let readTotal = (data: Record<string, any>, field: string) => {
  let value = data[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw createApiServiceError(`Borneo returned an invalid ${field} count.`);
  return value;
};
export let listMetadata = (data: Record<string, any>) => {
  if (
    data.nextToken !== undefined &&
    data.nextToken !== null &&
    typeof data.nextToken !== 'string'
  )
    throw createApiServiceError('Borneo returned an invalid continuation token.');
  return {
    ...(typeof data.nextToken === 'string' ? { nextToken: data.nextToken } : {}),
    raw: data
  };
};
export let attachDownload = async (
  add: (file: {
    type: 'url';
    url: string;
    headers?: Record<string, string>;
  }) => Promise<unknown>,
  value: unknown,
  token: string,
  baseUrl: unknown
) => {
  if (typeof value !== 'string' || !value)
    throw createApiServiceError(
      'Borneo did not return a download URL. Request the export again.'
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Borneo returned an invalid download URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password)
    throw createApiServiceError('Borneo returned an unsafe download URL.');
  let base = new URL(normalizeBaseUrl(baseUrl));
  let sameApi =
    url.origin === base.origin &&
    (url.pathname === base.pathname ||
      url.pathname.startsWith(`${base.pathname.replace(/\/+$/, '')}/`));
  await add({
    type: 'url',
    url: url.toString(),
    ...(sameApi ? { headers: { Authorization: `Bearer ${token}` } } : {})
  });
};
