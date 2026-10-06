import { ServiceError } from '@lowerdeck/error';
import { AuthConfigSecretRedactor, buildApiServiceError, createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };

export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw createApiServiceError(message);
}
export function integer(
  value: unknown,
  label = 'ID',
  min = 1,
  max = Number.MAX_SAFE_INTEGER
): asserts value is number {
  requireValue(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max,
    `Provide a ${label} integer between ${min} and ${max}.`
  );
}
export function credential(value: unknown, localLimit = 4096): asserts value is string {
  requireValue(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= localLimit &&
      [...value].every(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126),
    `Provide a credential without whitespace or control characters, within the local ${localLimit}-byte bound.`
  );
}
export function instance(value: unknown) {
  requireValue(
    typeof value === 'string' && value.length <= 2048,
    'Provide the HTTPS root URL of your Coupa instance.'
  );
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw createApiServiceError('Provide the HTTPS root URL of your Coupa instance.');
  }
  requireValue(
    parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash &&
      /^\/*$/.test(parsed.pathname),
    'Use your credential-free Coupa HTTPS root URL without a path, query or fragment.'
  );
  return parsed.origin;
}
export function decimal(
  value: number | undefined,
  exact: string | undefined,
  label: string,
  precision = 30,
  scale = 6
) {
  requireValue(
    value !== undefined || exact !== undefined,
    `Provide ${label} or its exact decimal string.`
  );
  if (value !== undefined)
    requireValue(
      Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER,
      `Use the exact decimal string for large ${label} values.`
    );
  const result = exact ?? String(value);
  requireValue(
    /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(result),
    `Provide ${label} as a plain decimal without exponent notation.`
  );
  const [whole = '', fraction = ''] = result.replace(/^-/, '').split('.');
  requireValue(
    whole.length <= precision - scale && fraction.length <= scale,
    `${label} exceeds the native decimal(${precision},${scale}) precision. Use a representable exact decimal.`
  );
  if (exact !== undefined && value !== undefined)
    requireValue(
      Number(exact) === value,
      `Conflicting numeric and exact ${label} values. Omit the numeric alias.`
    );
  return result;
}
export function safeJson(
  value: unknown,
  secrets: readonly string[],
  allowCredentialKeys = false
) {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw createApiServiceError('Coupa data is not valid JSON.');
  }
  requireValue(
    typeof serialized === 'string' && Buffer.byteLength(serialized) <= 16 * 1024 * 1024,
    'Coupa data exceeds the local 16 MiB bound. Request a smaller result.'
  );
  const variants = new Set<string>();
  for (const secret of secrets.filter(Boolean)) {
    variants.add(secret);
    variants.add(Buffer.from(secret).toString('hex'));
    variants.add(Buffer.from(secret).toString('hex').toUpperCase());
    let percent = secret,
      base64 = secret,
      base64url = secret;
    for (let depth = 0; depth < 5; depth++) {
      percent = encodeURIComponent(percent);
      base64 = Buffer.from(base64).toString('base64');
      base64url = Buffer.from(base64url).toString('base64url');
      variants.add(percent);
      variants.add(percent.toLowerCase());
      variants.add(base64);
      variants.add(base64url);
    }
  }
  const redactor = new AuthConfigSecretRedactor({ variants: [...variants] });
  const visit = (v: unknown, depth = 0) => {
    requireValue(depth <= 40, 'Coupa data exceeds the local nesting bound.');
    if (typeof v === 'string') {
      const candidates = [
        v,
        v.replace(/\\u([0-9a-fA-F]{4})/g, (_, n: string) =>
          String.fromCharCode(Number.parseInt(n, 16))
        )
      ];
      for (const candidate of candidates)
        requireValue(
          redactor.redactEmbedded(candidate) === candidate,
          'Credential-bearing Coupa input or response cannot be exposed. Remove credentials from data fields.'
        );
    } else if (Array.isArray(v)) v.forEach(item => visit(item, depth + 1));
    else if (v && typeof v === 'object')
      for (const [key, item] of Object.entries(v)) {
        requireValue(
          allowCredentialKeys ||
            item === null ||
            item === undefined ||
            item === '' ||
            !/^(?:password|password-confirmation|cxml-secret|cxml-invoice-secret|coupa-connect-secret|cxml-http-password|api-key|api_key|client-secret|client_secret|access-token|access_token|refresh-token|refresh_token)$/i.test(
              key
            ),
          'Credential fields cannot be supplied or exposed by these tools.'
        );
        visit(key, depth + 1);
        visit(item, depth + 1);
      }
  };
  visit(value);
}
export function upstream(error: unknown, mutation = false) {
  if (error instanceof ServiceError) return error;
  return buildApiServiceError(error, {
    providerLabel: 'Coupa',
    reason: 'coupa_request_failed',
    parent: {},
    formatMessage: c =>
      `Coupa request failed${c.status ? ` (HTTP ${c.status})` : ''}. Check instance, authentication mode, scopes and tenant configuration.${mutation ? ' The operation may have taken effect. Inspect the exact resource before retrying; no rollback was attempted.' : ''}`
  });
}
export function customFields(
  payload: Record<string, unknown>,
  fields: Record<string, unknown> | undefined,
  global = false
) {
  if (!fields) return;
  requireValue(Object.keys(fields).length > 0, 'Provide at least one custom field.');
  if (!global) {
    payload['custom-fields'] = fields;
    return;
  }
  for (const [key, value] of Object.entries(fields)) {
    requireValue(
      /^[a-z][a-z0-9_-]*$/i.test(key) &&
        ![
          'id',
          'status',
          'type',
          'name',
          'number',
          'supplier',
          'currency',
          'roles',
          'active',
          'login',
          'email',
          'quantity',
          'price',
          'order-lines',
          'invoice-lines',
          'expense-lines',
          'requisition-lines',
          'payment-term',
          'ship-to-user',
          'ship-to-address',
          'primary-contact',
          'primary-address',
          'default-address',
          'account-type',
          'firstname',
          'lastname',
          'employee-number',
          'department',
          'expensed-by',
          'requested-by',
          'transaction-date',
          'order-line',
          'invoice-number',
          'invoice-date',
          'po-number',
          'display-name',
          'website',
          'tax-id',
          'contract-type',
          'minimum-value',
          'maximum-value',
          'start-date',
          'end-date',
          'terms',
          'title',
          'justification',
          'custom-fields',
          '__proto__',
          'constructor',
          'prototype'
        ].includes(key) &&
        !(key in payload),
      'Legacy global custom fields must not replace native attributes. Use the custom-fields namespace for modern fields.'
    );
    payload[key] = value;
  }
}
export function page(count: number, input: { limit?: number; offset?: number }) {
  const limit = input.limit ?? 50,
    offset = input.offset ?? 0;
  const next = offset + count;
  requireValue(
    count !== limit || Number.isSafeInteger(next),
    'The next Coupa offset exceeds the local safe integer bound. Narrow the query; no usable continuation is inferred.'
  );
  return {
    pageLimit: limit,
    pageOffset: offset,
    nextOffset: count === limit ? offset + count : null,
    continuation: count === limit ? ('possible_more' as const) : ('short_page' as const)
  };
}
export const pageFields = {
  pageLimit: z.number().optional(),
  pageOffset: z.number().optional(),
  nextOffset: z.number().nullable().optional(),
  continuation: z.enum(['possible_more', 'short_page']).optional()
};
export const nativeSchema = z
  .object({ id: z.number().int().positive().safe() })
  .catchall(z.any());
export type NativeRecord = z.infer<typeof nativeSchema>;

export function publicJson(value: unknown, knownSecrets: readonly string[]) {
  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw createApiServiceError('Coupa response is not valid JSON.');
  }
  requireValue(
    typeof encoded === 'string' && Buffer.byteLength(encoded) <= 16 * 1024 * 1024,
    'Coupa response exceeds the local safety bound.'
  );
  const secrets = [...knownSecrets];
  const project = (v: unknown, depth = 0): unknown => {
    requireValue(depth <= 40, 'Coupa response exceeds the local nesting bound.');
    if (Array.isArray(v)) return v.map(item => project(item, depth + 1));
    if (v && typeof v === 'object') {
      const entries: [string, unknown][] = [];
      for (const [key, item] of Object.entries(v)) {
        if (
          ['cxml-secret', 'cxml-invoice-secret', 'coupa-connect-secret'].includes(key) &&
          item !== null &&
          item !== undefined &&
          item !== ''
        ) {
          requireValue(
            typeof item === 'string',
            'Coupa returned a malformed credential field.'
          );
          secrets.push(item);
          continue;
        }
        entries.push([key, project(item, depth + 1)]);
      }
      return Object.fromEntries(entries);
    }
    return v;
  };
  const projected = project(value);
  safeJson(projected, secrets);
  return { value: projected, secrets };
}
