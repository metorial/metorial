import type { SlateWebhookHttpResponseInit, SlateWebhookSkipped } from '../action';

export let skipWebhook = (
  reason: string,
  response?: Response | SlateWebhookHttpResponseInit
) => ({
  events: [],
  skipped: { reason } satisfies SlateWebhookSkipped,
  response: response ?? { status: 200, body: '' }
});
