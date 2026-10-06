import { AuthConfigSecretRedactor, createApiServiceError, getApiErrorStatus } from 'slates';
import { invalid, malformed } from './schemas';

export const tokenValue = (token: string) => {
  if (
    !token ||
    Array.from(token).some(char => {
      const point = char.codePointAt(0) ?? 0;
      return point <= 32 || point === 127 || (point >= 0xd800 && point <= 0xdfff);
    })
  )
    throw invalid('Provide a Sanity API token without whitespace or control characters.');
  return token;
};
export function serviceFailure(error: unknown) {
  const status = getApiErrorStatus(error);
  const guidance =
    status === 401
      ? 'Check token validity. User-profile reads require a personal user session; robot tokens cannot identify a user.'
      : status === 403
        ? 'Check token permissions and project or dataset access.'
        : status === 404
          ? 'Check the exact project, dataset, or resource ID and access.'
          : status === 409
            ? 'The resource or revision changed. Read it again before retrying.'
            : status === 429
              ? 'Retry later after the provider rate limit clears.'
              : 'Read the exact resource before retrying a write; the operation may already have taken effect.';
  return createApiServiceError(
    `Sanity request failed${status ? ` (HTTP ${status})` : ''}. ${guidance}`,
    { upstreamStatus: status }
  );
}
export function privateReceipt(token: string, additional: string[] = []) {
  const redactor = new AuthConfigSecretRedactor({ token, additional });
  const inspect = (value: unknown, depth = 0): void => {
    if (depth > 64) throw malformed();
    if (typeof value === 'string') {
      let text = value;
      for (let round = 0; round <= 5; round++) {
        if (redactor.redactEmbedded(text) !== text) throw malformed();
        for (const match of text.matchAll(/[A-Za-z0-9+/_-]{12,}={0,2}/g)) {
          const decoded = Buffer.from(match[0], 'base64').toString('utf8');
          if (redactor.redactEmbedded(decoded) !== decoded) throw malformed();
        }
        if (round === 5) break;
        const decoded = text.replace(/(?:%[a-f0-9]{2})+/gi, bytes =>
          Buffer.from(bytes.replaceAll('%', ''), 'hex').toString('utf8')
        );
        if (decoded === text) break;
        text = decoded;
      }
    } else if (Array.isArray(value)) value.forEach(item => inspect(item, depth + 1));
    else if (value && typeof value === 'object')
      for (const [key, item] of Object.entries(value)) {
        inspect(key, depth + 1);
        inspect(item, depth + 1);
      }
  };
  return inspect;
}
