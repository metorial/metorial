import { createApiServiceError } from 'slates';

export let validateToken = (value: unknown, label: string): string => {
  if (
    typeof value !== 'string' ||
    !value ||
    value !== value.trim() ||
    /^Bearer\s/i.test(value) ||
    Array.from(value).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) > 126)
  ) {
    throw createApiServiceError(
      `Provide the raw ${label} token without a Bearer prefix or whitespace.`,
      { reason: 'invalid_credentials' }
    );
  }
  return value;
};

export let validateLocator = (value: unknown, label: string): string => {
  if (
    typeof value !== 'string' ||
    !value ||
    value !== value.trim() ||
    value.length > 256 ||
    value === '.' ||
    value === '..' ||
    Array.from(value).some(char => {
      let code = char.charCodeAt(0);
      return code <= 32 || code === 127 || (code >= 0xd800 && code <= 0xdfff);
    }) ||
    /[/\\?#%]/.test(value)
  ) {
    throw createApiServiceError(
      `Provide a nonempty ${label} ID or alias from Contentful, without URL syntax.`,
      { reason: 'invalid_scope' }
    );
  }
  return value;
};

// Reject values that JSON would silently change, and never execute payload getters.
export let serializeJson = (value: unknown, maxBytes: number): string => {
  let ancestors = new Set<object>();
  let nodes = 0;
  let inspect = (item: unknown, depth: number): void => {
    if (++nodes > 100000 || depth > 64) throw new TypeError();
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    if (typeof item !== 'object' || !item || ancestors.has(item)) throw new TypeError();
    let array = Array.isArray(item);
    if (
      !array &&
      Object.getPrototypeOf(item) !== Object.prototype &&
      Object.getPrototypeOf(item) !== null
    )
      throw new TypeError();
    ancestors.add(item);
    let descriptors = Object.getOwnPropertyDescriptors(item);
    if (array && Object.keys(descriptors).length !== (item as unknown[]).length + 1)
      throw new TypeError();
    for (let [key, descriptor] of Object.entries(descriptors)) {
      if (array && key === 'length') continue;
      if (!descriptor.enumerable || !('value' in descriptor)) throw new TypeError();
      inspect(descriptor.value, depth + 1);
    }
    if (Object.getOwnPropertySymbols(item).length) throw new TypeError();
    ancestors.delete(item);
  };
  try {
    inspect(value, 0);
    let text = JSON.stringify(value);
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new TypeError();
    return text;
  } catch {
    throw createApiServiceError(
      `Contentful JSON must contain finite JSON values and fit within ${maxBytes} bytes.`,
      { reason: 'invalid_json' }
    );
  }
};

export let assertNoCredentials = (text: string, secrets: string[]): void => {
  let forms = secrets.flatMap(secret => [
    secret,
    JSON.stringify(secret).slice(1, -1),
    encodeURIComponent(secret),
    Buffer.from(secret).toString('base64'),
    Buffer.from(secret).toString('base64url')
  ]);
  let queue = [text];
  let queued = new Set(queue);
  let inspectedBytes = 0;
  for (let round = 0; round <= 4 && queue.length; round++) {
    let next: string[] = [];
    let enqueue = (candidate: string) => {
      if (queued.has(candidate)) return;
      queued.add(candidate);
      if (queued.size > 4096)
        throw createApiServiceError(
          'Contentful content exceeded the credential inspection limit. Request a smaller page.',
          { reason: 'content_inspection_limit' }
        );
      next.push(candidate);
    };
    for (let candidate of queue) {
      inspectedBytes += Buffer.byteLength(candidate, 'utf8');
      if (inspectedBytes > 32 * 1024 * 1024)
        throw createApiServiceError(
          'Contentful content exceeded the credential inspection limit. Request a smaller page.',
          { reason: 'content_inspection_limit' }
        );
      if (forms.some(form => candidate.includes(form)))
        throw createApiServiceError(
          'Contentful content contains configured credentials. Remove credential values from content or query variables before retrying.',
          { reason: 'credential_reflection' }
        );
      if (round === 4) continue;
      let decoded = candidate
        .replace(/\\+u([a-f0-9]{4})/gi, (_, hex: string) =>
          String.fromCharCode(Number.parseInt(hex, 16))
        )
        .replace(/(?:%[a-f0-9]{2})+/gi, part => {
          try {
            return decodeURIComponent(part);
          } catch {
            return part;
          }
        });
      if (decoded !== candidate) enqueue(decoded);
      for (let match of candidate.matchAll(/[A-Za-z0-9+/_-]{12,}={0,2}/g)) {
        let bytes = Buffer.from(match[0], 'base64url');
        let plain = bytes.toString('utf8');
        if (Buffer.from(plain).equals(bytes)) enqueue(plain);
      }
    }
    queue = next;
  }
};
