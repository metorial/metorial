import type { SlateTriggerRoutingMatcher } from 'slates';
import { createAxios, triggerGroup, verifyHmacSignature } from 'slates';
import { z } from 'zod';
import {
  buildSlackBotRoutingMatcher,
  buildSlackInstallRoutingMatchers,
  buildSlackUserRoutingMatcher
} from '../lib/routingMatcher';
import { spec } from '../spec';

let webhookConfigSchema = z.object({
  signingSecret: z
    .string()
    .describe('Signing Secret, from the Slack app’s Basic Information page'),
  appToken: z
    .string()
    .describe(
      'App-Level Token with the authorizations:read scope, from the Slack app’s Basic Information page'
    )
});

type SlackWebhookConfig = z.infer<typeof webhookConfigSchema>;

let slackAuthorization = z.object({
  enterprise_id: z.string().optional(),
  team_id: z.string().optional(),
  user_id: z.string().optional(),
  is_bot: z.boolean().optional(),
  is_enterprise_install: z.boolean().optional()
});

let slackEventEnvelope = z.object({
  type: z.string(),
  team_id: z.string().optional(),
  event_id: z.string().optional(),
  event_context: z.string().optional(),
  challenge: z.string().optional(),
  authorizations: z.array(slackAuthorization).optional(),
  event: z.object({ type: z.string() }).loose().optional()
});

type SlackEventEnvelope = z.infer<typeof slackEventEnvelope>;
type SlackAuthorization = z.infer<typeof slackAuthorization>;

let createSlackApi = () => createAxios({ baseURL: 'https://slack.com/api' });

let resolveAuthorizations = async (
  envelope: SlackEventEnvelope,
  appToken: string
): Promise<SlackAuthorization[]> => {
  if (envelope.authorizations && envelope.authorizations.length > 0) {
    return envelope.authorizations;
  }

  if (!envelope.event_context) return [];

  let client = createSlackApi();
  let response = await client.get('/apps.event.authorizations.list', {
    params: { event_context: envelope.event_context },
    headers: { Authorization: `Bearer ${appToken}` }
  });

  let data = response.data as { ok: boolean; authorizations?: SlackAuthorization[] };
  return data.ok ? (data.authorizations ?? []) : [];
};

let jsonResponse = (status: number, body?: unknown) => ({
  status,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? '' : JSON.stringify(body)
});

export let slackEventsTriggerGroup = triggerGroup(spec, {
  key: 'events',
  name: 'Slack Events',
  description:
    'Receives Slack Events API deliveries and routes each event to the installed workspaces/users it is visible to.',
  eventSchema: z.object({ type: z.string() }).loose()
})
  .webhook({
    manualRegistration: {
      userConfigSchema: webhookConfigSchema,
      fullConfigSchema: webhookConfigSchema,

      setup: async ctx => ({
        webhookSetupDocument: [
          '1. In your Slack app config, open **Event Subscriptions** and set the Request URL to:',
          '',
          `\`\`\`\n${ctx.input.webhookUrl}\`\`\``,
          '',
          '2. Subscribe to the bot/user events this integration needs.',
          '3. Open **Basic Information**, copy the **Signing Secret**, and enter it here.',
          '4. Under **App-Level Tokens**, generate a token with the `authorizations:read` scope and enter it here.'
        ].join('\n'),
        partialWebhookRegistrationPayload: {}
      }),

      finish: async ctx => ({
        webhookRegistrationPayload: ctx.input.userWebhookRegistrationPayload
      })
    },

    process: async ctx => {
      let { request, webhookRegistrationPayload } = ctx.input;
      let config = webhookRegistrationPayload as SlackWebhookConfig;

      let rawBody = await request.text();
      let timestamp = request.headers.get('x-slack-request-timestamp');
      let signature = request.headers.get('x-slack-signature');

      if (!timestamp || !signature) {
        return {
          events: [],
          response: jsonResponse(401, { error: 'missing signature headers' })
        };
      }

      // Reject stale requests - also guards against replaying a captured request indefinitely.
      let ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
      if (!Number.isFinite(ageSeconds) || ageSeconds > 60 * 5) {
        return { events: [], response: jsonResponse(401, { error: 'stale request' }) };
      }

      let signatureValid = verifyHmacSignature({
        secret: config.signingSecret,
        payload: `v0:${timestamp}:${rawBody}`,
        algorithm: 'sha256',
        digest: 'hex',
        prefix: 'v0=',
        signature
      });

      if (!signatureValid) {
        return { events: [], response: jsonResponse(401, { error: 'invalid signature' }) };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        return { events: [], response: jsonResponse(400, { error: 'invalid json' }) };
      }

      let envelope = slackEventEnvelope.safeParse(parsed);
      if (!envelope.success) {
        return { events: [], response: jsonResponse(200) };
      }

      let body = envelope.data;

      if (body.type === 'url_verification' && body.challenge) {
        return { events: [], response: jsonResponse(200, { challenge: body.challenge }) };
      }

      if (body.type !== 'event_callback' || !body.event) {
        return { events: [], response: jsonResponse(200) };
      }

      let authorizations = await resolveAuthorizations(body, config.appToken);

      let matchers = authorizations.flatMap((authorization): SlateTriggerRoutingMatcher[] => {
        let teamId = authorization.team_id ?? body.team_id;
        if (!teamId) return [];

        if (authorization.is_bot) {
          return [
            buildSlackBotRoutingMatcher({ enterpriseId: authorization.enterprise_id, teamId })
          ];
        }

        if (!authorization.user_id) return [];
        return [
          buildSlackUserRoutingMatcher({
            enterpriseId: authorization.enterprise_id,
            teamId,
            userId: authorization.user_id
          })
        ];
      });

      if (matchers.length === 0) {
        return { events: [], response: jsonResponse(200) };
      }

      return {
        events: [
          {
            matchers,
            payload: body.event,
            idempotencyKey: body.event_id
          }
        ],
        response: jsonResponse(200)
      };
    }
  })
  .routingMatchers(async ctx => buildSlackInstallRoutingMatchers(ctx.auth))
  .build();
