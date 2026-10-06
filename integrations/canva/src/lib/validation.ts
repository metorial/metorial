import { AuthConfigSecretRedactor, createApiServiceError } from 'slates';

export function fail(message: string): never {
  throw createApiServiceError(message);
}
export function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be nonempty.`);
  try {
    encodeURIComponent(value);
  } catch {
    fail(`${label} contains invalid Unicode.`);
  }
  return value;
}
export function id(value: unknown): string {
  const valueText = text(value, 'Canva ID');
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(valueText))
    fail('Use the exact Canva ID, without a URL, path or query.');
  return valueText;
}
export function publicUrl(value: unknown): string {
  const valueText = text(value, 'Public source URL');
  let url: URL;
  try {
    url = new URL(valueText);
  } catch {
    fail('Provide a valid publicly accessible HTTP or HTTPS URL.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    valueText.length > 2048
  )
    fail(
      'Provide a public HTTP or HTTPS URL without embedded credentials or fragments, at most 2048 characters.'
    );
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.includes(':')
  )
    fail('Use a publicly accessible hostname, not a local or IP address.');
  return valueText;
}
export class ConnectionGuard {
  private readonly redactor;
  constructor(values: unknown[]) {
    const variants: Record<string, string> = {};
    for (const [index, value] of values.entries()) {
      if (typeof value !== 'string' || !value) continue;
      text(value, 'Connection credential');
      variants[`value${index}`] = value;
      variants[`base64${index}`] = Buffer.from(value).toString('base64');
      variants[`base64url${index}`] = Buffer.from(value).toString('base64url');
      variants[`hex${index}`] = Buffer.from(value).toString('hex');
      variants[`hexUpper${index}`] = Buffer.from(value).toString('hex').toUpperCase();
      let encoded = value;
      for (let depth = 0; depth < 4; depth++) {
        encoded = encodeURIComponent(encoded);
        variants[`uri${index}_${depth}`] = encoded;
      }
    }
    this.redactor = new AuthConfigSecretRedactor(variants);
  }
  check(value: unknown): void {
    const seen = new Set<object>();
    let nodes = 0;
    const visit = (item: unknown, depth: number): void => {
      if (++nodes > 100000 || depth > 80)
        fail('Canva data exceeds the bounded validation limit.');
      if (typeof item === 'string') {
        try {
          encodeURIComponent(item);
        } catch {
          fail('Canva data contains invalid Unicode.');
        }
        if (item.length > 4 * 1024 * 1024)
          fail('Canva data exceeds the bounded validation limit.');
        let candidates = [item];
        const tested = new Set<string>();
        for (let round = 0; round < 5; round++) {
          const next: string[] = [];
          for (const candidate of candidates) {
            if (tested.has(candidate)) continue;
            tested.add(candidate);
            if (this.redactor.redactEmbedded(candidate) !== candidate)
              fail(
                'Connection credentials were reflected in Canva data. No such data was returned.'
              );
            try {
              next.push(decodeURIComponent(candidate));
            } catch {
              /* Native percent signs need not be encoded. */
            }
            if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(candidate) && candidate.length >= 4)
              next.push(Buffer.from(candidate, 'base64').toString('utf8'));
          }
          candidates = next;
        }
      } else if (item && typeof item === 'object' && !seen.has(item)) {
        seen.add(item);
        for (const key of Reflect.ownKeys(item)) {
          visit(typeof key === 'symbol' ? key.description : key, depth + 1);
          const descriptor = Object.getOwnPropertyDescriptor(item, key);
          if (!descriptor || !('value' in descriptor))
            fail('Canva data contains an unsupported accessor.');
          visit(descriptor.value, depth + 1);
        }
      }
    };
    visit(value, 0);
  }
}
