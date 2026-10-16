import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  decodeApiErrorBody,
  isApiErrorRecord,
  pushBoundedApiErrorDetail,
  readApiErrorText
} from 'slates';
import { z } from 'zod';

// Remove account credentials while retaining unrelated scoped download signatures.
export let redactCredentials = (value: unknown, token: string): unknown => {
  if (typeof value === 'string') {
    let candidate = value;
    for (let depth = 0; depth < 8; depth++) {
      if (token && candidate.includes(token)) return '[REDACTED]';
      let compact = candidate.replace(/[\t\n\r]/g, '');
      if (token && compact.includes(token)) return '[REDACTED]';
      for (let match of compact.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
        try {
          let url = new URL(match[0]);
          if (token && url.href.includes(token)) return '[REDACTED]';
          if (token && url.hostname.includes(token.toLowerCase())) return '[REDACTED]';
        } catch {
          // Error prose need not contain a valid URL.
        }
      }
      let decoded = candidate.replace(/(?:%[\da-f]{2})+/gi, encoded => {
        try {
          return decodeURIComponent(encoded);
        } catch {
          return encoded.replace(/%([\da-f]{2})/gi, (_, hex: string) =>
            String.fromCharCode(Number.parseInt(hex, 16))
          );
        }
      });
      if (decoded === candidate) break;
      candidate = decoded;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(item => redactCredentials(item, token));
  if (isApiErrorRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        redactCredentials(key, token) as string,
        /^(authorization|api[_-]?key|access[_-]?token|client[_-]?secret)$/i.test(key)
          ? '[REDACTED]'
          : redactCredentials(item, token)
      ])
    );
  }
  return value;
};

export let zylvieError = (error: unknown, token: string, operation: string) => {
  if (error instanceof ServiceError) return error;
  return buildApiServiceError(error, {
    providerLabel: 'Zylvie',
    reason: 'zylvie_api_error',
    operation,
    parent: {},
    extractResponse: (input, helpers) => {
      let response = helpers.getResponseWithBody(input);
      return response
        ? {
            ...response,
            statusText: undefined,
            data: redactCredentials(decodeApiErrorBody(response.data), token)
          }
        : undefined;
    },
    extractMessage: (input, helpers) => {
      let body = redactCredentials(
        decodeApiErrorBody(helpers.getResponseWithBody(input)?.data),
        token
      );
      let details: string[] = [];
      let visit = (value: unknown, path = '', depth = 0) => {
        if (depth > 6 || details.length >= 5) return;
        if (Array.isArray(value)) {
          value.forEach((entry, index) => visit(entry, `${path}[${index}]`, depth + 1));
        } else if (isApiErrorRecord(value)) {
          for (let [key, entry] of Object.entries(value))
            visit(entry, path ? `${path}.${key}` : key, depth + 1);
        } else {
          pushBoundedApiErrorDetail(details, value, { field: path });
        }
      };
      if (isApiErrorRecord(body)) {
        for (let key of ['message', 'detail', 'error', 'errors', 'error_description']) {
          if (body[key] !== undefined) visit(body[key], key);
        }
      } else visit(body);
      return (
        details.join('; ') ||
        readApiErrorText(
          redactCredentials(error instanceof Error ? error.message : undefined, token)
        ) ||
        'The request could not be completed. Check your API key and request parameters.'
      );
    },
    extractUpstreamCode: (_input, response) => {
      if (!isApiErrorRecord(response?.data)) return undefined;
      return readApiErrorText(response.data.code ?? response.data.error_code);
    }
  });
};

export let accountResponse = z.looseObject({ email: z.string(), brand: z.string() });
export let productResponse = z.looseObject({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  currency: z.string(),
  price: z.number(),
  pricing_model: z.string(),
  display: z.string()
});
export let createdProductResponse = productResponse.extend({ created: z.number() });
export let couponResponse = z.looseObject({
  id: z.string(),
  code: z.string(),
  type: z.string(),
  amount: z.number(),
  is_storewide: z.boolean(),
  is_live: z.boolean(),
  redemption_count: z.number(),
  limit_one_per_email: z.boolean().optional(),
  valid_for_days: z.number().nullable().optional()
});
export let listedCouponResponse = couponResponse.extend({
  created: z.string(),
  is_archived: z.boolean(),
  limit: z.number().nullable(),
  duration_in_months: z.number().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  products: z.array(z.string()),
  affiliate: z.string().nullable(),
  requires_subscription_product: z.string().nullable()
});
export let licenseResponse = z.looseObject({
  key: z.string(),
  created: z.number(),
  redeemed: z.boolean(),
  redeemed_at: z.number().nullable(),
  refunded: z.boolean(),
  refunded_at: z.number().nullable()
});
export let verifiedLicenseResponse = licenseResponse.extend({
  product_id: z.string(),
  buyer_email: z.string()
});
export let subscriptionResponse = z.looseObject({
  subscription_id: z.string(),
  created_at: z.string(),
  cancel_at: z.string().nullable(),
  canceled_at: z.string().nullable(),
  trial_end: z.string().nullable(),
  trial_start: z.string().nullable(),
  currency: z.string(),
  amount: z.number(),
  interval: z.string(),
  interval_count: z.number(),
  status: z.string(),
  product: z.looseObject({ title: z.string() }),
  subscriber: z
    .looseObject({ name: z.string().optional(), email: z.string().optional() })
    .optional()
});
export let operationResponse = z.looseObject({ status: z.string(), message: z.string() });
export let rawResponseSchema = z.record(z.string(), z.unknown()).describe('Provider response');
