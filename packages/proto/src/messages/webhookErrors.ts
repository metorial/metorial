export let SLATES_WEBHOOK_ERROR_CODES = {
  INVALID_SIGNATURE: 'webhook.invalid_signature',
  INVALID_PAYLOAD: 'webhook.invalid_payload',
  UNSUPPORTED_EVENT: 'webhook.unsupported_event',
  DUPLICATE_DELIVERY: 'webhook.duplicate_delivery',
  UNAUTHORIZED: 'webhook.unauthorized'
} as const;

export type SlatesWebhookErrorCode =
  (typeof SLATES_WEBHOOK_ERROR_CODES)[keyof typeof SLATES_WEBHOOK_ERROR_CODES];

export let SLATES_WEBHOOK_ERROR_DEFAULTS: Record<
  SlatesWebhookErrorCode,
  { status: number; retryable: boolean }
> = {
  [SLATES_WEBHOOK_ERROR_CODES.INVALID_SIGNATURE]: { status: 401, retryable: false },
  [SLATES_WEBHOOK_ERROR_CODES.INVALID_PAYLOAD]: { status: 400, retryable: false },
  [SLATES_WEBHOOK_ERROR_CODES.UNSUPPORTED_EVENT]: { status: 400, retryable: false },
  [SLATES_WEBHOOK_ERROR_CODES.DUPLICATE_DELIVERY]: { status: 200, retryable: false },
  [SLATES_WEBHOOK_ERROR_CODES.UNAUTHORIZED]: { status: 401, retryable: false }
};
