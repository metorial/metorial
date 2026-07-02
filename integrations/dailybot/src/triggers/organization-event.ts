import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

let organizationEventTypes = [
  'organization.user_activated',
  'organization.user_deactivated',
  'organization.team_user_added',
  'organization.team_user_removed'
] as const;

export let organizationEventTrigger = SlateTrigger.create(spec, {
  name: 'Organization Event',
  key: 'organization_event',
  description:
    'Triggered when users are activated/deactivated or added/removed from teams in the organization.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of organization event'),
      eventTimestamp: z.string().describe('Timestamp of the event'),
      hookId: z.string().describe('ID of the webhook'),
      hookName: z.string().optional().describe('Name of the webhook'),
      body: z.any().describe('Event payload body')
    })
  )
  .output(
    z.object({
      userUuid: z.string().optional().describe('UUID of the affected user'),
      userName: z.string().optional().describe('Name of the affected user'),
      teamUuid: z
        .string()
        .optional()
        .describe('UUID of the team (for team membership events)'),
      teamName: z
        .string()
        .optional()
        .describe('Name of the team (for team membership events)'),
      isActive: z
        .boolean()
        .optional()
        .describe('New active status (for activation/deactivation events)'),
      raw: z.any().describe('Full event body')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DailyBotClient({ token: ctx.auth.token });

      let result = await client.createWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        name: 'Slates - Organization Events',
        subscriptions: [...organizationEventTypes]
      });

      return {
        registrationDetails: {
          hookId: result?.id ?? result?.uuid ?? result?.hook_id,
          hookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new DailyBotClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { hookId: string; hookUrl: string };
      await client.deleteWebhook(details.hookId, details.hookUrl);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event ?? 'unknown',
            eventTimestamp: data.event_timestamp ?? new Date().toISOString(),
            hookId: data.hook?.id ?? '',
            hookName: data.hook?.name,
            body: data.body ?? data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let body = ctx.input.body ?? {};
      let user = body.user ?? {};
      let team = body.team ?? {};

      let eventType = ctx.input.eventType;
      let isActive: boolean | undefined;

      if (eventType === 'organization.user_activated') isActive = true;
      if (eventType === 'organization.user_deactivated') isActive = false;

      let eventSuffix = eventType.replace('organization.', '');

      return {
        type: `organization.${eventSuffix}`,
        id: `${ctx.input.hookId}-${ctx.input.eventTimestamp}-${user.uuid ?? ctx.input.eventTimestamp}`,
        output: {
          userUuid: user.uuid ?? user.id,
          userName: user.full_name ?? user.name,
          teamUuid: team.uuid ?? team.id,
          teamName: team.name,
          isActive,
          raw: ctx.input.body
        }
      };
    }
  })
  .build();
