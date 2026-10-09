import { skipWebhook, triggerGroup } from 'slates';
import { z } from 'zod';
import { normalizeAppId } from '../lib/botFramework';
import {
  buildTeamsBotActivityRoutingMatchers,
  buildTeamsBotConnectionRoutingMatchers
} from '../lib/routingMatcher';
import { spec } from '../spec';
import {
  assertActivityMatchesToken,
  BotConnectorJwtError,
  BotConnectorMetadataError,
  verifyBotConnectorToken
} from './botFrameworkJwt';

let GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let webhookConfigSchema = z.object({
  microsoftAppId: z
    .string()
    .trim()
    .regex(GUID_PATTERN, 'Must be a Microsoft App ID GUID')
    .describe('Microsoft App ID, from the Azure Bot resource Configuration page')
});

type TeamsBotWebhookConfig = z.infer<typeof webhookConfigSchema>;

let channelAccountSchema = z
  .object({
    id: z.string(),
    name: z.string().nullish(),
    aadObjectId: z.string().nullish(),
    role: z.string().nullish()
  })
  .loose();

let activityEnvelopeSchema = z
  .object({
    type: z.string(),
    id: z.string().nullish(),
    timestamp: z.string().nullish(),
    channelId: z.string().nullish(),
    serviceUrl: z.string().nullish(),
    from: channelAccountSchema.nullish(),
    recipient: channelAccountSchema.nullish(),
    conversation: z.object({ id: z.string() }).loose().nullish(),
    membersAdded: z.array(channelAccountSchema).nullish(),
    membersRemoved: z.array(channelAccountSchema).nullish(),
    reactionsAdded: z.array(z.object({ type: z.string() }).loose()).nullish(),
    reactionsRemoved: z.array(z.object({ type: z.string() }).loose()).nullish()
  })
  .loose();

export type TeamsActivity = z.infer<typeof activityEnvelopeSchema> & Record<string, any>;
export type TeamsChannelAccount = z.infer<typeof channelAccountSchema>;

export type TeamsActivityEventKind =
  | 'message'
  | 'message_update'
  | 'message_delete'
  | 'reaction_added'
  | 'reaction_removed'
  | 'member_added'
  | 'member_removed';

/**
 * Normalized payload emitted per activity, or per member / reaction for
 * activities that carry several of them, so each trigger maps exactly one
 * provider change.
 */
export let teamsActivityEventSchema = z
  .object({
    kind: z.enum([
      'message',
      'message_update',
      'message_delete',
      'reaction_added',
      'reaction_removed',
      'member_added',
      'member_removed'
    ]),
    activity: z.object({ type: z.string() }).loose(),
    member: channelAccountSchema.optional(),
    reaction: z.object({ type: z.string() }).loose().optional()
  })
  .loose();

export type TeamsActivityEvent = {
  kind: TeamsActivityEventKind;
  activity: TeamsActivity;
  member?: TeamsChannelAccount;
  reaction?: { type: string; [key: string]: unknown };
};

let jsonResponse = (status: number, body?: unknown) => ({
  status,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? '' : JSON.stringify(body)
});

let jwtFailureStatus = (error: BotConnectorJwtError) =>
  error.failure === 'endorsement_missing' ? 403 : 401;

export let splitTeamsActivity = (activity: TeamsActivity): TeamsActivityEvent[] => {
  switch (activity.type) {
    case 'message':
      return [{ kind: 'message', activity }];
    case 'messageUpdate':
      return [{ kind: 'message_update', activity }];
    case 'messageDelete':
      return [{ kind: 'message_delete', activity }];
    case 'messageReaction':
      return [
        ...(activity.reactionsAdded ?? []).map(reaction => ({
          kind: 'reaction_added' as const,
          activity,
          reaction
        })),
        ...(activity.reactionsRemoved ?? []).map(reaction => ({
          kind: 'reaction_removed' as const,
          activity,
          reaction
        }))
      ];
    case 'conversationUpdate':
      return [
        ...(activity.membersAdded ?? []).map(member => ({
          kind: 'member_added' as const,
          activity,
          member
        })),
        ...(activity.membersRemoved ?? []).map(member => ({
          kind: 'member_removed' as const,
          activity,
          member
        }))
      ];
    default:
      return [];
  }
};

let idempotencyKeyFor = (event: TeamsActivityEvent) =>
  [
    event.activity.type,
    event.activity.conversation?.id ?? '',
    event.activity.id ?? '',
    event.activity.timestamp ?? '',
    event.kind,
    event.member?.id ?? event.reaction?.type ?? ''
  ].join('|');

export let teamsBotTriggerGroup = triggerGroup(spec, {
  key: 'bot_activities',
  name: 'Teams Bot Activities',
  description:
    'Receives Microsoft Teams bot activities (messages, edits, deletions, reactions, and membership changes) sent to the Azure Bot messaging endpoint.',
  eventSchema: teamsActivityEventSchema
})
  .webhook({
    manualRegistration: {
      userConfigSchema: webhookConfigSchema,
      fullConfigSchema: webhookConfigSchema,

      setup: async ctx => ({
        webhookSetupDocument: [
          'Connect the Azure Bot resource for your Microsoft Teams app to this endpoint.',
          '',
          '> Finish this setup (enter the Microsoft App ID below and save) before you save the messaging endpoint in Azure. Until then, every request to the endpoint is rejected.',
          '',
          '1. In the Azure portal, open your **Azure Bot** resource and go to **Settings → Configuration**.',
          '2. Copy the **Microsoft App ID** and enter it below.',
          '3. Set **Messaging endpoint** to:',
          '',
          `\`\`\`\n${ctx.input.webhookUrl}\n\`\`\``,
          '',
          '4. Save the configuration, then open **Channels** and make sure **Microsoft Teams** is enabled.',
          '5. Install the Teams app that uses this bot in the personal chats, group chats, or teams it should serve.',
          '',
          'Requests are accepted only when they carry a valid Bot Connector token issued for this Microsoft App ID.'
        ].join('\n'),
        partialWebhookRegistrationPayload: {}
      }),

      finish: async ctx => ({
        webhookRegistrationPayload: webhookConfigSchema.parse({
          ...ctx.input.partialWebhookRegistrationPayload,
          ...ctx.input.userWebhookRegistrationPayload
        })
      })
    },

    process: async ctx => {
      let { request, webhookRegistrationPayload } = ctx.input;

      let savedConfig = webhookConfigSchema.safeParse(webhookRegistrationPayload);
      if (!savedConfig.success) {
        ctx.warn({ message: 'Rejected Teams bot activity: invalid saved registration' });
        return skipWebhook(
          'microsoft_teams_webhook_registration_invalid',
          jsonResponse(500, { error: 'invalid webhook registration' })
        );
      }
      let config: TeamsBotWebhookConfig = savedConfig.data;
      let appId = normalizeAppId(config.microsoftAppId);

      if (request.method.toUpperCase() !== 'POST') {
        return skipWebhook('microsoft_teams_webhook_method_not_allowed', {
          status: 405,
          headers: { allow: 'POST', 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'method not allowed' })
        });
      }

      let rawBody = await request.text();

      let token: Awaited<ReturnType<typeof verifyBotConnectorToken>>;
      try {
        token = await verifyBotConnectorToken({
          authorization: request.headers.get('authorization'),
          appId
        });
      } catch (error) {
        if (error instanceof BotConnectorMetadataError) {
          // Not skipped: a 5xx lets the Bot Connector retry once the public
          // signing keys are reachable again.
          ctx.warn({ message: 'Teams bot activity: signing keys unavailable' });
          return {
            events: [],
            response: jsonResponse(503, { error: 'signing keys unavailable' })
          };
        }
        if (error instanceof BotConnectorJwtError) {
          ctx.warn({
            message: 'Rejected Teams bot activity: token verification failed',
            failure: error.failure
          });
          return skipWebhook(
            `microsoft_teams_webhook_${error.failure}`,
            jsonResponse(jwtFailureStatus(error), { error: 'unauthorized' })
          );
        }
        throw error;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        ctx.warn({ message: 'Rejected Teams bot activity: body is not valid JSON' });
        return skipWebhook(
          'microsoft_teams_webhook_json_invalid',
          jsonResponse(400, { error: 'invalid json' })
        );
      }

      let envelope = activityEnvelopeSchema.safeParse(parsed);
      if (!envelope.success) {
        ctx.warn({ message: 'Rejected Teams bot activity: not a Bot Framework activity' });
        return skipWebhook(
          'microsoft_teams_webhook_activity_invalid',
          jsonResponse(400, { error: 'invalid activity' })
        );
      }
      let activity = envelope.data as TeamsActivity;

      try {
        assertActivityMatchesToken(token, activity);
      } catch (error) {
        if (error instanceof BotConnectorJwtError) {
          ctx.warn({
            message: 'Rejected Teams bot activity: token does not match activity',
            failure: error.failure
          });
          return skipWebhook(
            `microsoft_teams_webhook_${error.failure}`,
            jsonResponse(jwtFailureStatus(error), { error: 'unauthorized' })
          );
        }
        throw error;
      }

      // Bot ids in Teams are `28:<MicrosoftAppId>`; a different bot id means
      // the activity was addressed to another bot.
      let recipientId = activity.recipient?.id?.toLowerCase();
      if (recipientId?.startsWith('28:') && recipientId !== `28:${appId}`) {
        ctx.warn({ message: 'Rejected Teams bot activity: recipient is not this bot' });
        return skipWebhook(
          'microsoft_teams_webhook_recipient_mismatch',
          jsonResponse(403, { error: 'recipient mismatch' })
        );
      }

      if (activity.channelId !== 'msteams') {
        ctx.info({
          message: 'Ignored bot activity from a non-Teams channel',
          channelId: activity.channelId
        });
        return skipWebhook(
          'microsoft_teams_webhook_ignored_channel',
          jsonResponse(200, { ok: true, reason: 'ignored_channel' })
        );
      }

      if (!activity.conversation?.id || !activity.id) {
        return skipWebhook(
          'microsoft_teams_webhook_activity_incomplete',
          jsonResponse(400, { error: 'activity is missing id or conversation' })
        );
      }

      let events = splitTeamsActivity(activity);
      if (events.length === 0) {
        ctx.info({ message: 'Ignored Teams bot activity type', type: activity.type });
        return skipWebhook(
          'microsoft_teams_webhook_ignored_activity_type',
          jsonResponse(200, { ok: true, reason: 'ignored_activity_type' })
        );
      }

      let matchers = buildTeamsBotActivityRoutingMatchers(
        appId,
        activity.channelData?.tenant?.id ?? activity.conversation?.tenantId
      );

      return {
        events: events.map(event => ({
          payload: event,
          matchers,
          idempotencyKey: idempotencyKeyFor(event)
        })),
        response: jsonResponse(200)
      };
    }
  })
  .routingMatchers(async ctx => buildTeamsBotConnectionRoutingMatchers(ctx.auth))
  .build();
