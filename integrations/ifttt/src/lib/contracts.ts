import { isServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';

export function invalid(message: string): never {
  throw createApiServiceError(message, { reason: 'ifttt_validation' });
}
export function inconsistent(): never {
  throw createApiServiceError(
    'IFTTT returned incomplete or inconsistent data. An execution or configuration change may have been accepted; inspect the exact target before retrying.',
    { reason: 'ifttt_response' }
  );
}
export function text(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.length ||
    value.length > 4096 ||
    Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    return invalid(
      `Provide a nonempty ${label} without control characters, up to 4096 characters.`
    );
  try {
    encodeURIComponent(value);
  } catch {
    return invalid(`Provide valid Unicode for ${label}.`);
  }
  return value;
}
export const segment = (value: unknown, label: string): string => {
  const result = text(value, label);
  if (result === '.' || result === '..')
    return invalid(`Provide the exact ${label}, not a relative path.`);
  return encodeURIComponent(result);
};
export const credential = (value: unknown, label: string): string => {
  const result = text(value, label);
  if (/\s/.test(result)) return invalid(`Provide the ${label} without whitespace or a URL.`);
  return result;
};
export const webhookKey = (value: unknown): string => {
  const result = credential(value, 'Webhooks key');
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(result))
    return invalid(
      'Provide only the Webhooks key copied from IFTTT Documentation, not the webhook URL.'
    );
  return result;
};
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return inconsistent();
  return value as Record<string, unknown>;
}

// Inspect native data before projection; discarded fields can also reflect credentials.
export function protect(value: unknown, credentials: readonly string[]) {
  const secrets = credentials
    .filter(Boolean)
    .flatMap(secret => [
      secret,
      JSON.stringify(secret).slice(1, -1),
      encodeURIComponent(secret),
      Buffer.from(secret).toString('base64'),
      Buffer.from(secret).toString('base64url')
    ]);
  if (!secrets.length) return;
  const seen = new Set<object>();
  let nodes = 0,
    inspectedBytes = 0;
  const visit = (item: unknown, depth = 0): void => {
    if (++nodes > 50000 || depth > 64) inconsistent();
    if (typeof item === 'string') {
      let queue = [item];
      const queued = new Set(queue);
      for (let round = 0; round <= 4 && queue.length; round++) {
        const next: string[] = [];
        const add = (candidate: string) => {
          if (queued.has(candidate)) return;
          if (queued.size >= 4096) inconsistent();
          queued.add(candidate);
          next.push(candidate);
        };
        for (const candidate of queue) {
          inspectedBytes += Buffer.byteLength(candidate);
          if (inspectedBytes > 16 * 1024 * 1024) inconsistent();
          if (secrets.some(secret => candidate.includes(secret))) inconsistent();
          if (round === 4) continue;
          add(
            candidate
              .replace(/\\+u([a-f0-9]{4})/gi, (_, hex: string) =>
                String.fromCharCode(Number.parseInt(hex, 16))
              )
              .replace(/(?:%[a-f0-9]{2})+/gi, bytes =>
                Buffer.from(bytes.replaceAll('%', ''), 'hex').toString('utf8')
              )
          );
          for (const fragment of candidate.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
            const bytes = Buffer.from(fragment[0], 'base64url'),
              decoded = bytes.toString('utf8');
            if (Buffer.from(decoded).equals(bytes)) add(decoded);
          }
        }
        queue = next;
      }
    } else if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item);
      let properties: PropertyDescriptorMap;
      try {
        properties = Object.getOwnPropertyDescriptors(item);
      } catch {
        inconsistent();
      }
      for (const [key, property] of Object.entries(properties)) {
        visit(key, depth + 1);
        if (!('value' in property)) inconsistent();
        visit(property.value, depth + 1);
      }
    }
  };
  visit(value);
}

export function json(value: unknown, label: string, maxBytes = 1024 * 1024) {
  let nodes = 0;
  const seen = new Set<object>();
  const inspect = (item: unknown, depth = 0): void => {
    if (++nodes > 50000 || depth > 40)
      invalid(`${label} exceeds the supported JSON complexity.`);
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    if (!item || typeof item !== 'object' || seen.has(item))
      invalid(`${label} must contain finite, acyclic JSON values.`);
    const prototype = Object.getPrototypeOf(item);
    if (!Array.isArray(item) && prototype !== Object.prototype && prototype !== null)
      invalid(`${label} must contain plain JSON objects.`);
    seen.add(item);
    for (const key of Reflect.ownKeys(item)) {
      if (typeof key !== 'string') invalid(`${label} must have JSON property names.`);
      if (Array.isArray(item) && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor || !('value' in descriptor))
        invalid(`${label} cannot contain accessors.`);
      inspect(descriptor.value, depth + 1);
    }
    seen.delete(item);
  };
  inspect(value);
  if (Buffer.byteLength(JSON.stringify(value)) > maxBytes)
    invalid(`${label} exceeds the supported ${maxBytes} byte limit.`);
}
export function upstream(error: unknown, secrets: readonly string[]): never {
  if (isServiceError(error)) {
    protect(error, secrets);
    throw error;
  }
  const status = getApiErrorStatus(error);
  throw buildApiServiceError(
    typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? { response: { status } }
      : {},
    {
      providerLabel: 'IFTTT',
      reason: 'ifttt_api',
      parent: {},
      fallbackMessage:
        'The IFTTT request failed. Inspect the target before retrying an execution or configuration change.'
    }
  );
}
