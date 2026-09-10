import { createHmacSignature, SlateTriggerGroup } from 'slates';
import { z } from 'zod';
import { TEST_SIGNATURE_HEADER, verifyBodySignature } from '../lib/hmac';
import { jsonResponse, textResponse } from '../lib/http';
import { buildAccountRoutingMatcher, buildAccountRoutingMatchers } from '../lib/matchers';
import { spec } from '../spec';

let webhookRegistrationPayloadSchema = z.object({
  secret: z.string(),
  channelId: z.string(),
  accountId: z.string(),
  workspaceId: z.string()
});

type WebhookRegistrationPayload = z.infer<typeof webhookRegistrationPayloadSchema>;

let AUTO_WEBHOOK_TARGETS = [
  {
    channelId: 'alpha',
    name: 'Channel Alpha',
    description: 'Primary auto-registered webhook target',
    targetOwnership: 'single_user' as const
  },
  {
    channelId: 'beta',
    name: 'Channel Beta',
    description: 'Shared auto-registered webhook target',
    targetOwnership: 'multi_user' as const
  },
  {
    channelId: 'gamma',
    name: 'Channel Gamma',
    description: 'Second-page auto-registered webhook target',
    targetOwnership: 'single_user' as const
  }
];

let targetIdentifier = (accountId: string, channelId: string) => `${accountId}:${channelId}`;

let toWebhookTarget = (
  accountId: string,
  target: (typeof AUTO_WEBHOOK_TARGETS)[number]
) => ({
  webhookTargetIdentifier: targetIdentifier(accountId, target.channelId),
  name: target.name,
  description: target.description,
  metadata: { channelId: target.channelId },
  webhookTargetPayload: { channelId: target.channelId, accountId },
  targetOwnership: target.targetOwnership
});

export let autoWebhookGroup = SlateTriggerGroup.create(spec, {
  key: 'auto_webhook',
  name: 'Auto Webhook',
  description:
    'Auto-registers per-channel webhooks, verifies HMAC signatures, and routes events by account and workspace.'
})
  .webhook({
    autoRegistration: {
      webhookTargetList: async ctx => {
        let accountId = ctx.auth.accountId;
        let pageToken = ctx.input.pageToken;

        if (pageToken === 'page-2') {
          return {
            targets: AUTO_WEBHOOK_TARGETS.slice(2).map(target =>
              toWebhookTarget(accountId, target)
            ),
            nextPageToken: null
          };
        }

        if (pageToken) {
          return { targets: [], nextPageToken: null };
        }

        return {
          targets: AUTO_WEBHOOK_TARGETS.slice(0, 2).map(target =>
            toWebhookTarget(accountId, target)
          ),
          nextPageToken: 'page-2'
        };
      },

      webhookRegister: async ctx => {
        let channelId =
          typeof ctx.input.webhookTargetPayload?.channelId === 'string'
            ? ctx.input.webhookTargetPayload.channelId
            : 'unknown';

        let secret = createHmacSignature({
          secret: ctx.auth.token,
          payload: ctx.input.webhookTargetIdentifier,
          digest: 'hex'
        });

        return {
          webhookRegistrationIdentifier: `reg-${ctx.input.webhookTargetIdentifier}`,
          webhookRegistrationPayload: {
            secret,
            channelId,
            accountId: ctx.auth.accountId,
            workspaceId: ctx.config.workspaceId,
            webhookUrl: ctx.input.webhookUrl
          } satisfies WebhookRegistrationPayload & { webhookUrl: string }
        };
      },

      webhookUnregister: async ctx => {
        if (!String(ctx.input.webhookRegistrationIdentifier).startsWith('reg-')) {
          throw new Error(
            `Unknown webhook registration: ${ctx.input.webhookRegistrationIdentifier}`
          );
        }
      }
    },

    process: async ctx => {
      let registration = webhookRegistrationPayloadSchema.safeParse(
        ctx.input.webhookRegistrationPayload
      );
      if (!registration.success) {
        return {
          events: [],
          response: jsonResponse(400, { error: 'invalid registration payload' })
        };
      }

      let request = ctx.input.request;
      let url = new URL(request.url);

      if (request.method === 'GET') {
        let challenge = url.searchParams.get('hub.challenge');
        if (url.searchParams.get('hub.mode') === 'subscribe' && challenge) {
          return { events: [], response: textResponse(200, challenge) };
        }

        return {
          events: [],
          response: jsonResponse(400, { error: 'missing challenge' })
        };
      }

      let rawBody = await request.text();
      let signatureValid = verifyBodySignature({
        secret: registration.data.secret,
        body: rawBody,
        signature: request.headers.get(TEST_SIGNATURE_HEADER)
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

      let rawEvents = Array.isArray(parsed) ? parsed : [parsed];
      let matchers = [
        buildAccountRoutingMatcher({
          accountId: registration.data.accountId,
          workspaceId: registration.data.workspaceId
        })
      ];

      return {
        events: rawEvents.flatMap(event => {
          if (!event || typeof event !== 'object' || Array.isArray(event)) return [];

          let payload = event as Record<string, unknown>;
          return [
            {
              matchers,
              payload: {
                ...payload,
                channelId:
                  typeof payload.channelId === 'string'
                    ? payload.channelId
                    : registration.data.channelId
              },
              idempotencyKey: typeof payload.id === 'string' ? payload.id : undefined
            }
          ];
        }),
        response: jsonResponse(201, { ok: true }, { 'x-test-webhook-response': 'auto' })
      };
    }
  })
  .routingMatchers(async ctx => buildAccountRoutingMatchers(ctx))
  .build();
