import { AuthConfigSecretRedactor, createApiServiceError, getApiErrorStatus } from 'slates';
import { invalid, malformed } from './schemas';

export function tokenValue(value: unknown, label = 'Make credential'): string {
  if (
    typeof value !== 'string' ||
    !value ||
    [...value].some(c => {
      const n = c.codePointAt(0) ?? 0;
      return n <= 32 || n === 127 || (n >= 0xd800 && n <= 0xdfff);
    })
  )
    throw invalid(`${label} is missing or invalid. Reconnect with a valid credential.`);
  return value;
}
export function serviceFailure(error: unknown) {
  const status = getApiErrorStatus(error);
  return createApiServiceError(
    `Make request failed${status ? ` (HTTP ${status})` : ''}. ${status === 401 ? 'Check the credential and regional host; reconnect if OAuth refresh failed.' : status === 403 ? 'Check granted scopes and exact organization/team access.' : status === 404 ? 'Check the exact resource ID, regional host, and access.' : status === 429 ? 'Retry later after the provider limit clears.' : 'Read the exact resource or execution history before retrying; the operation may already have taken effect.'}`,
    { upstreamStatus: status }
  );
}
export function privateReceipt(secrets: Record<string, unknown>, value: unknown) {
  const redactor = new AuthConfigSecretRedactor(secrets);
  let nodes = 0;
  const visit = (item: unknown, depth = 0): void => {
    if (++nodes > 100000 || depth > 64) throw malformed();
    if (typeof item === 'string') {
      let text = item;
      for (let round = 0; round <= 5; round++) {
        if (redactor.redactEmbedded(text) !== text) throw malformed();
        for (const match of text.matchAll(/[A-Za-z0-9+/_-]{12,}={0,2}/g))
          if (
            redactor.redactEmbedded(Buffer.from(match[0], 'base64').toString('utf8')) !==
            Buffer.from(match[0], 'base64').toString('utf8')
          )
            throw malformed();
        if (round === 5) break;
        const decoded = text.replace(/(?:%[a-f0-9]{2})+/gi, bytes =>
          Buffer.from(bytes.replaceAll('%', ''), 'hex').toString('utf8')
        );
        if (decoded === text) break;
        text = decoded;
      }
    } else if (Array.isArray(item)) item.forEach(child => visit(child, depth + 1));
    else if (item && typeof item === 'object')
      for (const [k, child] of Object.entries(item)) {
        visit(k, depth + 1);
        visit(child, depth + 1);
      }
  };
  visit(value);
}
