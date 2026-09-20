import type { SlateWebhookHttpResponseInit, SlateWebhookSkipped } from '../action';

export let skipWebhook = (
  reason: string,
  message?: string,
  response?: Response | SlateWebhookHttpResponseInit
) => ({
  events: [],
  skipped: { reason, message } satisfies SlateWebhookSkipped,
  response: response ?? { status: 200, body: '' }
});
