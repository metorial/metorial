import type { SlateAttachment } from '../action/attachment';

/**
 * Placeholder prefix used to mark a redacted auth-config secret. Must match the hub's
 * AuthConfigSecretSerializer (oss/src/slates/apps/hub/src/lib/secretSerializer.ts) exactly --
 * the hub resolves these placeholders back to live secret values when it proxies an attachment.
 */
export let AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX = '$$MT$secret$authConfig$';

/** Decides whether an auth-config value (with its dotted path) may be replaced. */
export type AuthConfigSecretFilter = (secret: string, path: string) => boolean;

let ALWAYS: AuthConfigSecretFilter = () => true;

/**
 * Maps auth-config string leaves to `$$MT$secret$authConfig$<path>` placeholders.
 * `redact` preserves whole-value substitution for HTTP traces; `redactEmbedded` also
 * replaces embedded values in attachment credentials, terminating those placeholders with `$$`.
 * Both accept a `wholeValue` filter so diagnostics (traces, error text) can skip
 * non-secret fields such as account IDs, emails, or subdomains; attachment callers keep
 * the default, because the hub resolves every placeholder back to its value.
 */
export class AuthConfigSecretRedactor {
  // A value shared by several fields keeps every path, so a filter that rejects one
  // field (e.g. `username`) can still match another (e.g. `token`) with the same value.
  private readonly secretToPaths = new Map<string, string[]>();

  public constructor(authConfig: Record<string, unknown> | undefined) {
    if (authConfig) this.buildSecretMap(authConfig);
  }

  public redact<T>(value: T, wholeValue: AuthConfigSecretFilter = ALWAYS): T {
    return this.transform(value, stringValue => {
      return this.placeholderFor(stringValue, wholeValue) ?? stringValue;
    });
  }

  /**
   * `embeddable` limits which secrets are also replaced inside longer strings;
   * `wholeValue` limits which secrets replace a string that equals them exactly.
   */
  public redactEmbedded<T>(
    value: T,
    embeddable: AuthConfigSecretFilter = ALWAYS,
    wholeValue: AuthConfigSecretFilter = ALWAYS
  ): T {
    let embeddedPlaceholders = new Map<string, string>();
    for (let secret of this.secretToPaths.keys()) {
      let placeholder = this.placeholderFor(secret, embeddable);
      if (placeholder) embeddedPlaceholders.set(secret, placeholder);
    }
    if (embeddedPlaceholders.size === 0) return this.redact(value, wholeValue);

    let pattern = new RegExp(
      [...embeddedPlaceholders.keys()]
        .sort((a, b) => b.length - a.length)
        // Escape regex metacharacters so values match literally; $& inserts the matched character.
        .map(secret => secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
      'g'
    );

    return this.transform(value, stringValue => {
      let exactPlaceholder = this.placeholderFor(stringValue, wholeValue);
      if (exactPlaceholder) return exactPlaceholder;

      return stringValue.replace(pattern, secret => `${embeddedPlaceholders.get(secret)}$$`);
    });
  }

  // The last registered path that passes the filter wins, matching the historical
  // last-write-wins behavior when no filter is given.
  private placeholderFor(value: string, filter: AuthConfigSecretFilter) {
    let paths = this.secretToPaths.get(value);
    if (!paths) return undefined;
    for (let index = paths.length - 1; index >= 0; index--) {
      let path = paths[index];
      if (path !== undefined && filter(value, path))
        return `${AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX}${path}`;
    }
    return undefined;
  }

  private buildSecretMap(value: unknown, path: string[] = []): void {
    if (typeof value === 'string') {
      // Never register "" -- it would replace every empty header/query value with a placeholder.
      if (value.length === 0) return;

      let paths = this.secretToPaths.get(value);
      if (paths) paths.push(path.join('.'));
      else this.secretToPaths.set(value, [path.join('.')]);
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

// Credentials replaced inside URLs (e.g. Telegram's `/file/bot<token>/` path). Kept narrow:
// a placeholder in a URL makes the hub proxy the download instead of handing out the link.
let URL_CREDENTIAL_KEY = /^(?:.*[-_])?(?:token|secret|password|api[-_]?key)$/i;

export let isUrlEmbeddedCredential = (secret: string, path: string) =>
  secret.length >= 8 && URL_CREDENTIAL_KEY.test(path.split('.').pop() ?? '');

/**
 * Applied to every finalized attachment list right before it's sent over
 * `slates/action.tool.invoke` (see @slates/provider-handler). Only `type: 'url'` attachments
 * carry credentials -- content/upload_reference attachments pass through untouched.
 */
export let redactUrlAttachmentSecrets = (
  attachments: SlateAttachment[] | undefined,
  authConfig: Record<string, unknown> | undefined
): SlateAttachment[] | undefined => {
  if (!authConfig || !attachments) return attachments;

  let redactor = new AuthConfigSecretRedactor(authConfig);

  return attachments.map(attachment => {
    if (attachment.content.type !== 'url') return attachment;

    let { url, headers, query } = attachment.content;
    return {
      ...attachment,
      content: {
        ...attachment.content,
        url: redactor.redactEmbedded(url, isUrlEmbeddedCredential),
        ...(headers ? { headers: redactor.redactEmbedded(headers) } : {}),
        ...(query ? { query: redactor.redactEmbedded(query) } : {})
      }
    };
  });
};
