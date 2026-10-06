import { AuthConfigSecretRedactor, createApiServiceError } from 'slates';

export function fail(message: string): never {
  throw createApiServiceError(message);
}

export const positiveId = (value: unknown, name = 'Resource ID'): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    fail(`${name} must be a positive safe integer from OneLogin.`);
  }
  return value as number;
};

export const tenant = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(value)
  ) {
    fail('Use your OneLogin tenant subdomain only, without a URL, domain suffix or path.');
  }
  return (value as string).toLowerCase();
};

export const text = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} is required.`);
  try {
    encodeURIComponent(value as string);
  } catch {
    fail(`${name} contains invalid Unicode.`);
  }
  return value as string;
};

export const registrationId = (value: unknown): string => {
  const id = text(value, 'Registration ID');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    fail('Use the exact UUID registration ID returned by enrollment.');
  }
  return id;
};

// Screen only known connection credentials; app SSO and requested MFA setup secrets are native outputs.
export class CredentialGuard {
  private readonly redactor;
  constructor(values: unknown[]) {
    const variants: Record<string, string> = {};
    let index = 0;
    for (const value of values) {
      if (typeof value !== 'string' || !value) continue;
      text(value, 'Connection credential');
      const forms = new Set([
        value,
        Buffer.from(value).toString('base64'),
        Buffer.from(value).toString('base64url')
      ]);
      let encoded = value;
      for (let layer = 0; layer < 5; layer++) {
        encoded = encodeURIComponent(encoded);
        forms.add(encoded);
      }
      for (const form of forms) variants[String(index++)] = form;
    }
    this.redactor = new AuthConfigSecretRedactor(variants);
  }
  check(value: unknown): void {
    const seen = new Set<object>();
    const checkString = (value: string): void => {
      const candidates = new Set([value]);
      let frontier = [value];
      for (let layer = 0; layer < 5 && frontier.length; layer++) {
        const next: string[] = [];
        for (const item of frontier) {
          if (this.redactor.redactEmbedded(item) !== item)
            fail(
              'Connection credentials were found in request or response data. No such data was returned.'
            );
          if (item.length > 4 * 1024 * 1024)
            fail('OneLogin data exceeds the bounded credential validation limit.');
          const decoded: string[] = [];
          try {
            decoded.push(decodeURIComponent(item));
          } catch {
            /* A native percent sign need not be URI encoding. */
          }
          if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(item) && item.length >= 4) {
            decoded.push(Buffer.from(item, 'base64').toString('utf8'));
          }
          for (const candidate of decoded)
            if (!candidates.has(candidate)) {
              candidates.add(candidate);
              next.push(candidate);
            }
        }
        frontier = next;
      }
      for (const item of frontier)
        if (this.redactor.redactEmbedded(item) !== item)
          fail(
            'Connection credentials were found in request or response data. No such data was returned.'
          );
    };
    const visit = (item: unknown, depth: number): void => {
      if (depth > 100) fail('OneLogin returned data that cannot be safely validated.');
      if (typeof item === 'string') {
        try {
          encodeURIComponent(item);
        } catch {
          fail('OneLogin data contains invalid Unicode.');
        }
        checkString(item);
      } else if (item && typeof item === 'object' && !seen.has(item)) {
        seen.add(item);
        for (const key of Reflect.ownKeys(item)) {
          visit(typeof key === 'symbol' ? key.description : key, depth + 1);
          const descriptor = Object.getOwnPropertyDescriptor(item, key);
          if (descriptor && 'value' in descriptor) visit(descriptor.value, depth + 1);
          else if (descriptor) fail('OneLogin data contains an unsupported accessor.');
        }
      }
    };
    visit(value, 0);
  }
}
