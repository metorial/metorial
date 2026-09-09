import type { SlateAttachment } from '../action/attachment';

/**
 * Placeholder prefix used to mark a redacted auth-config secret. Must match the hub's
 * AuthConfigSecretSerializer (oss/src/slates/apps/hub/src/lib/secretSerializer.ts) exactly --
 * the hub resolves these placeholders back to live secret values when it proxies an attachment.
 */
export let AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX = '$$MT$secret$authConfig$';

/**
 * Maps auth-config string leaves to `$$MT$secret$authConfig$<path>` placeholders.
 * `redact` preserves whole-value substitution for HTTP traces; `redactEmbedded` also
 * replaces embedded values in attachment credentials, terminating those placeholders with `$$`.
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

  public redactEmbedded<T>(value: T): T {
    if (this.secretToPlaceholder.size === 0) return value;

    let pattern = new RegExp(
      [...this.secretToPlaceholder.keys()]
        .sort((a, b) => b.length - a.length)
        // Escape regex metacharacters so values match literally; $& inserts the matched character.
        .map(secret => secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
      'g'
    );

    return this.transform(value, stringValue => {
      let exactPlaceholder = this.secretToPlaceholder.get(stringValue);
      if (exactPlaceholder) return exactPlaceholder;

      return stringValue.replace(
        pattern,
        secret => `${this.secretToPlaceholder.get(secret)}$$`
      );
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
          ? redactor.redactEmbedded(attachment.content.headers)
          : undefined,
        query: attachment.content.query
          ? redactor.redactEmbedded(attachment.content.query)
          : undefined
      }
    };
  });
};
