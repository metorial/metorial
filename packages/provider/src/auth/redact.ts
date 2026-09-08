import type { SlateAttachment } from '../action/attachment';

/**
 * Placeholder prefix used to mark a redacted auth-config secret. Must match the hub's
 * AuthConfigSecretSerializer (oss/src/slates/apps/hub/src/lib/secretSerializer.ts) exactly --
 * the hub resolves these placeholders back to live secret values when it proxies an attachment.
 */
export let AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX = '$$MT$secret$authConfig$';

/**
 * Walks an auth config object and replaces any string value that exactly matches one of its
 * leaf values with a `$$MT$secret$authConfig$<path>` placeholder. Literal, whole-value
 * substitution only -- not a substring scan, and not a heuristic key-name/value-shape guess
 * like the http trace redactor in '../axios/trace'.
 */
export class AuthConfigSecretRedactor {
  private readonly secretToPlaceholder = new Map<string, string>();

  public constructor(authConfig: Record<string, unknown> | undefined) {
    if (authConfig) this.buildSecretMap(authConfig);
  }

  public redact<T>(value: T): T {
    return this.transform(value, stringValue => {
      return this.secretToPlaceholder.get(stringValue) ?? stringValue;
    });
  }

  private buildSecretMap(value: unknown, path: string[] = []): void {
    if (typeof value === 'string') {
      // Never register "" -- it would replace every empty header/query value with a placeholder.
      if (value.length === 0) return;

      this.secretToPlaceholder.set(
        value,
        `${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}${path.join('.')}`
      );
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.buildSecretMap(item, [...path, String(index)]);
      });

      return;
    }

    if (this.isPlainObject(value)) {
      Object.entries(value).forEach(([key, nestedValue]) => {
        this.buildSecretMap(nestedValue, [...path, key]);
      });
    }
  }

  private transform<T>(value: T, transformString: (value: string) => string): T {
    if (typeof value === 'string') {
      return transformString(value) as T;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.transform(item, transformString)) as T;
    }

    if (this.isPlainObject(value)) {
      let result: Record<string, unknown> = {};

      Object.entries(value).forEach(([key, nestedValue]) => {
        result[key] = this.transform(nestedValue, transformString);
      });

      return result as T;
    }

    return value;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

/**
 * Applied to every finalized attachment list right before it's sent over
 * `slates/action.tool.invoke` (see @slates/provider-handler). Only `type: 'url'` attachments
 * carry headers/query -- content/upload_reference attachments pass through untouched.
 */
export let redactUrlAttachmentSecrets = (
  attachments: SlateAttachment[] | undefined,
  authConfig: Record<string, unknown> | undefined
): SlateAttachment[] | undefined => {
  if (!authConfig || !attachments) return attachments;

  let redactor = new AuthConfigSecretRedactor(authConfig);

  return attachments.map(attachment => {
    if (attachment.content.type !== 'url') return attachment;
    if (!attachment.content.headers && !attachment.content.query) return attachment;

    return {
      ...attachment,
      content: {
        ...attachment.content,
        headers: attachment.content.headers
          ? redactor.redact(attachment.content.headers)
          : undefined,
        query: attachment.content.query ? redactor.redact(attachment.content.query) : undefined
      }
    };
  });
};
