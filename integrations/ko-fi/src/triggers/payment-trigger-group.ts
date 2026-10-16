import { createHash } from 'node:crypto';
import { createApiServiceError, skipWebhook, triggerGroup } from 'slates';
import { z } from 'zod';
import { verifyWebhookToken } from '../lib/client';
import { spec } from '../spec';
import { paymentEnvelopeSchema, paymentEventSchema } from './event-schemas';

let registrationSchema = z.object({
  token: z
    .string()
    .refine(value => value.trim().length > 0)
    .describe(
      'Verification token from https://ko-fi.com/manage/webhooks. Use the same token as the connected account.'
    )
});

let tokenDigest = (token: string) => createHash('sha256').update(token, 'utf8').digest();

// Ko-fi exposes no recipient account ID in its official payment payload. A digest
// of the verified, account-specific token ties both sides to the same registration
// without persisting the credential itself in event payloads or routing matchers.
export let buildPaymentRoutingMatcher = (token: string) => ({
  verificationTokenDigest: tokenDigest(token).toString('hex')
});

export let paymentEvents = triggerGroup(spec, {
  key: 'payments',
  name: 'Ko-fi Payments',
  description:
    'Receives payment notifications from the webhook configured in your Ko-fi account.',
  eventSchema: paymentEventSchema
})
  .webhook({
    manualRegistration: {
      userConfigSchema: registrationSchema,
      fullConfigSchema: registrationSchema,
      setup: async ctx => ({
        webhookSetupDocument: [
          '1. Open https://ko-fi.com/manage/webhooks and copy your verification token from the advanced settings.',
          '2. Enter that token below and use the same token for the connected Ko-fi account.',
          '3. Finish this setup before saving or testing the webhook URL in Ko-fi; an endpoint awaiting setup rejects incoming requests.',
          '4. After finishing setup, set the Ko-fi Webhook URL to:',
          '',
          `\`\`\`\n${ctx.input.webhookUrl}\n\`\`\``,
          '',
          '5. Save the URL in Ko-fi. You can then use its test-payment option.',
          'Only payment notifications are available; membership cancellations are not reported. Treat these notifications as sensitive payment and supporter data.'
        ].join('\n'),
        partialWebhookRegistrationPayload: {}
      }),
      finish: async ctx => {
        let partial = ctx.input.partialWebhookRegistrationPayload;
        let supplied = ctx.input.userWebhookRegistrationPayload;
        let parsed = registrationSchema.safeParse({ ...partial, ...supplied });
        if (!parsed.success) {
          throw createApiServiceError(
            'Enter the verification token from your Ko-fi webhook settings.'
          );
        }
        return { webhookRegistrationPayload: parsed.data };
      }
    },
    process: async ctx => {
      let reject = (
        reason: string,
        status: number,
        message: string,
        headers?: Record<string, string>
      ) => {
        ctx.warn({ message, reason });
        return skipWebhook(`ko_fi_webhook_${reason}`, { status, body: message, headers });
      };
      let registration = registrationSchema.safeParse(ctx.input.webhookRegistrationPayload);
      if (!registration.success)
        return reject('registration_invalid', 500, 'Invalid webhook registration.');
      let { request } = ctx.input;
      if (request.method !== 'POST')
        return reject('method_invalid', 405, 'Expected an HTTP POST request.', {
          Allow: 'POST'
        });
      if (
        request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
        'application/x-www-form-urlencoded'
      ) {
        return reject(
          'content_type_invalid',
          415,
          'Expected a form-encoded payment notification.'
        );
      }
      let parsed: unknown;
      try {
        let raw = new TextDecoder('utf-8', { fatal: true }).decode(
          await request.arrayBuffer()
        );
        // URLSearchParams tolerates invalid percent escapes/UTF-8. Reject those
        // instead of silently replacing invalid bytes before JSON validation.
        for (let part of raw.split('&')) {
          for (let value of part.split('=')) decodeURIComponent(value.replace(/\+/g, ' '));
        }
        let form = new URLSearchParams(raw);
        let data = form.getAll('data');
        if (data.length !== 1 || !data[0])
          return reject('data_invalid', 400, 'Expected exactly one payment data field.');
        parsed = JSON.parse(data[0]);
      } catch {
        return reject('body_invalid', 400, 'Invalid payment notification encoding or JSON.');
      }
      let token = z.object({ verification_token: z.string().min(1) }).safeParse(parsed);
      if (!token.success) return reject('token_missing', 401, 'Missing verification token.');
      if (!verifyWebhookToken(token.data, registration.data.token)) {
        return reject(
          'token_invalid',
          403,
          'Payment does not match this webhook registration.'
        );
      }
      let payment = paymentEnvelopeSchema.safeParse(parsed);
      if (!payment.success)
        return reject('payload_invalid', 400, 'Invalid payment notification fields.');
      // Ko-fi documents a shared token, not HMAC signatures or a signed replay
      // window. Do not impose a timestamp expiry that would reject valid retries.
      let { verification_token: _token, ...payload } = payment.data;
      return {
        events: [
          {
            payload,
            matchers: [buildPaymentRoutingMatcher(registration.data.token)],
            idempotencyKey: payload.message_id
          }
        ],
        response: { status: 200, body: '' }
      };
    }
  })
  .routingMatchers(async ctx => {
    if (typeof ctx.auth.token !== 'string' || !ctx.auth.token.trim()) {
      throw createApiServiceError(
        'Reconnect Ko-fi with the verification token from your webhook settings.'
      );
    }
    return [buildPaymentRoutingMatcher(ctx.auth.token)];
  })
  .build();
