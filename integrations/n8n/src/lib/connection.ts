import { createApiServiceError } from 'slates';

export type Row = Record<string, unknown>;
export type AuthOutput = { token: string; baseUrl?: string };
export const record = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const invalid = (message: string) => createApiServiceError(message, { parent: {} });
export function text(value: unknown, label: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > 4096)
    throw invalid(`Provide a valid ${label}.`);
  return value;
}
export function id(value: unknown, label = 'resource ID'): string {
  const result = text(value, label);
  if (
    result !== result.trim() ||
    result === '.' ||
    result === '..' ||
    /[\\/?#%]/.test(result) ||
    [...result].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid(`Provide the exact ${label}, without a path or URL.`);
  return result;
}
export function executionId(value: unknown): string {
  const result = id(value, 'execution ID');
  if (!/^[1-9][0-9]*$/.test(result))
    throw invalid('Use the positive integer execution ID returned by list_executions.');
  return result;
}
export function baseUrl(value: unknown): string {
  const raw = text(value, 'n8n API base URL');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw invalid('Provide the explicit n8n instance API URL, including /api/v1.');
  }
  if (
    raw !== raw.trim() ||
    /[\\]/.test(raw) ||
    !['http:', 'https:'].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    [...raw].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
    /%2f|%5c|%2e/i.test(url.pathname) ||
    /(?:^|\/)\.\.?(?:\/|$)/.test(raw.replace(/^https?:\/\/[^/]+/, ''))
  )
    throw invalid(
      'Use a credential-free HTTP or HTTPS n8n API root with no query, fragment, or dot segments.'
    );
  const path = url.pathname.replace(/\/+$/, '');
  if (!path.endsWith('/api/v1'))
    throw invalid(
      'The supported Public API root must end in /api/v1. Include the deployment path and port when applicable.'
    );
  return `${url.origin}${path}`;
}
export function connection(auth: AuthOutput, config?: unknown): Required<AuthOutput> {
  const token = text(auth.token, 'raw n8n API key');
  if (
    token !== token.trim() ||
    [...token].some(c => c.charCodeAt(0) < 33 || c.charCodeAt(0) === 127)
  )
    throw invalid('Provide the raw API key without a header prefix, whitespace or controls.');
  const legacy =
    record(config) && config.baseUrl !== undefined ? baseUrl(config.baseUrl) : undefined;
  const saved = auth.baseUrl !== undefined ? baseUrl(auth.baseUrl) : legacy;
  if (!saved)
    throw invalid(
      'Reconnect with your explicit n8n instance API base URL; no cloud destination is inferred.'
    );
  if (legacy && auth.baseUrl !== undefined && legacy !== saved)
    throw invalid(
      'The saved credential instance and legacy configuration conflict. Reconnect to the intended instance before continuing.'
    );
  return { token, baseUrl: saved };
}
export function secretFree(
  value: unknown,
  secrets: string[],
  seen = new Set<object>()
): boolean {
  const needles = secrets
    .filter(Boolean)
    .flatMap(secret => [
      secret,
      encodeURIComponent(secret),
      JSON.stringify(secret).slice(1, -1),
      Buffer.from(secret).toString('base64'),
      Buffer.from(secret).toString('base64url')
    ]);
  if (!needles.length) return true;
  let nodes = 0,
    bytes = 0;
  const inspect = (item: unknown, depth = 0): boolean => {
    if (++nodes > 50000 || depth > 64) return false;
    if (typeof item === 'string') {
      let queue = [item];
      const visited = new Set(queue);
      for (let round = 0; round <= 4 && queue.length; round++) {
        const next: string[] = [];
        const add = (candidate: string) => {
          if (!visited.has(candidate)) {
            visited.add(candidate);
            next.push(candidate);
          }
        };
        for (const candidate of queue) {
          bytes += Buffer.byteLength(candidate);
          if (bytes > 16 * 1024 * 1024 || needles.some(needle => candidate.includes(needle)))
            return false;
          if (round === 4) continue;
          add(
            candidate
              .replace(/\\+u([a-f0-9]{4})/gi, (_, hex: string) =>
                String.fromCharCode(Number.parseInt(hex, 16))
              )
              .replace(/(?:%[a-f0-9]{2})+/gi, encoded =>
                Buffer.from(encoded.replaceAll('%', ''), 'hex').toString('utf8')
              )
          );
          for (const fragment of candidate.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
            const buffer = Buffer.from(fragment[0], 'base64url'),
              decoded = buffer.toString('utf8');
            if (Buffer.from(decoded).equals(buffer)) add(decoded);
          }
          if (visited.size > 4096) return false;
        }
        queue = next;
      }
      return true;
    }
    if (!item || (typeof item !== 'object' && typeof item !== 'function') || seen.has(item))
      return true;
    seen.add(item);
    if (
      ArrayBuffer.isView(item) &&
      !inspect(
        Buffer.from(item.buffer, item.byteOffset, item.byteLength).toString('utf8'),
        depth + 1
      )
    )
      return false;
    if (item instanceof ArrayBuffer && !inspect(Buffer.from(item).toString('utf8'), depth + 1))
      return false;
    for (const key of Reflect.ownKeys(item)) {
      if (!inspect(String(key), depth + 1)) return false;
      const property = Object.getOwnPropertyDescriptor(item, key);
      if (!property) return false;
      if (!('value' in property)) {
        if (
          (item === Object.prototype && key === '__proto__') ||
          (item === Function.prototype && (key === 'arguments' || key === 'caller'))
        )
          continue;
        return false;
      }
      if (!inspect(property.value, depth + 1)) return false;
    }
    const prototype = Object.getPrototypeOf(item);
    if (
      prototype === Object.prototype ||
      prototype === Array.prototype ||
      prototype === Function.prototype
    )
      return true;
    return inspect(prototype, depth + 1);
  };
  try {
    return inspect(value);
  } catch {
    return false;
  }
}

export { z } from 'zod';
