import { SlateTriggerGroup } from 'slates';
import { z } from 'zod';
import {
  isTimestampFresh,
  TEST_SIGNATURE_HEADER,
  TEST_TIMESTAMP_HEADER,
  verifyTimestampedSignature
} from '../lib/hmac';
import { jsonResponse } from '../lib/http';
import { buildAccountRoutingMatcher, buildAccountRoutingMatchers } from '../lib/matchers';
import { spec } from '../spec';

export let manualWebhookUserConfigSchema = z.object({
  signingSecret: z.string().describe('HMAC signing secret used to verify inbound webhooks')
});

export let manualWebhookFullConfigSchema = z.object({
  signingSecret: z.string(),
  webhookUrl: z.string()
});

type ManualWebhookRegistrationPayload = z.infer<typeof manualWebhookFullConfigSchema>;

export let manualWebhookGroup = SlateTriggerGroup.create(spec, {
  key: 'manual_webhook',
  name: 'Manual Webhook',
  description:
    'Manually registered webhook endpoint. The user pastes the callback URL into an external app and supplies a signing secret.'
})
  .webhook({
    manualRegistration: {
      userConfigSchema: manualWebhookUserConfigSchema,
      fullConfigSchema: manualWebhookFullConfigSchema,

      setup: async ctx => ({
        webhookSetupDocument: [
          '1. In the external app, set the webhook Request URL to:',
          '',
          `\`\`\`\n${ctx.input.webhookUrl}\n\`\`\``,
          '',
          '2. Paste the **Signing Secret** from that app below.',
          '3. Subscribe to the events this integration should receive.'
        ].join('\n'),
        partialWebhookRegistrationPayload: {
          webhookUrl: ctx.input.webhookUrl
        }
      }),

      finish: async ctx => ({
        webhookRegistrationPayload: {
          signingSecret: ctx.input.userWebhookRegistrationPayload.signingSecret,
          webhookUrl:
            ctx.input.partialWebhookRegistrationPayload.webhookUrl ?? ctx.input.webhookUrl
        }
      })
    },

    process: async ctx => {
      let registration = ctx.input.webhookRegistrationPayload as
        | ManualWebhookRegistrationPayload
        | undefined;
      let request = ctx.input.request;
      let rawBody = await request.text();
      let timestamp = request.headers.get(TEST_TIMESTAMP_HEADER);
      let signature = request.headers.get(TEST_SIGNATURE_HEADER);

      if (!registration?.signingSecret) {
        return {
          events: [],
          response: jsonResponse(400, { error: 'missing signing secret' })
        };
      }

      if (!timestamp || !signature) {
        return {
          events: [],
          response: jsonResponse(401, { error: 'missing signature headers' })
        };
      }

      if (!isTimestampFresh(timestamp)) {
        return { events: [], response: jsonResponse(401, { error: 'stale request' }) };
      }

      let signatureValid = verifyTimestampedSignature({
        secret: registration.signingSecret,
        timestamp,
        body: rawBody,
        signature
      });

      if (!signatureValid) {
        return {
          events: [],
          response: jsonResponse(401, { error: 'invalid signature' })
        };
      }

      let parsed: unknown;
      try {
        parsed = rawBody.trim() ? JSON.parse(rawBody) : {};
      } catch {
        return { events: [], response: jsonResponse(400, { error: 'invalid json' }) };
      }

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        (parsed as { type?: unknown }).type === 'url_verification'
      ) {
        let challenge = (parsed as { challenge?: unknown }).challenge;
        if (typeof challenge === 'string') {
          return {
            events: [],
            response: jsonResponse(200, { challenge })
          };
        }
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { events: [], response: jsonResponse(200) };
      }

      let payload = parsed as Record<string, unknown>;
      let accountId = typeof payload.accountId === 'string' ? payload.accountId : undefined;
      let workspaceId =
        typeof payload.workspaceId === 'string' ? payload.workspaceId : undefined;

      if (!accountId || !workspaceId) {
        return { events: [], response: jsonResponse(200) };
      }

      return {
        events: [
          {
            matchers: [buildAccountRoutingMatcher({ accountId, workspaceId })],
            payload,
            idempotencyKey: typeof payload.id === 'string' ? payload.id : undefined
          }
        ],
        response: jsonResponse(200, { ok: true })
      };
    }
  })
  .routingMatchers(async ctx => buildAccountRoutingMatchers(ctx))
  .build();
