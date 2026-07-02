import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

let checkinResponseEventTypes = [
  'followups.response.completed',
  'followups.response.updated',
  'followups.response.deleted'
] as const;

export let checkinResponseTrigger = SlateTrigger.create(spec, {
  name: 'Check-in Response',
  key: 'checkin_response',
  description:
    'Triggered when a check-in response is completed, updated, or deleted by a team member. Anonymous responses will not include user information.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of check-in response event'),
      eventTimestamp: z.string().describe('Timestamp of the event'),
      hookId: z.string().describe('ID of the webhook'),
      hookName: z.string().optional().describe('Name of the webhook'),
      body: z.any().describe('Event payload body')
    })
  )
  .output(
    z.object({
      checkinUuid: z.string().optional().describe('UUID of the check-in'),
      checkinName: z.string().optional().describe('Name of the check-in'),
      responseUuid: z.string().optional().describe('UUID of the response'),
      userUuid: z.string().optional().describe('UUID of the responding user'),
      userName: z.string().optional().describe('Name of the responding user'),
      isAnonymous: z.boolean().optional().describe('Whether the response is anonymous'),
      hasBlocker: z.boolean().optional().describe('Whether the response includes a blocker'),
      completedAt: z.string().optional().describe('When the response was completed'),
      answers: z.array(z.any()).optional().describe('List of question/answer pairs'),
      raw: z.any().describe('Full event body')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DailyBotClient({ token: ctx.auth.token });

      let result = await client.createWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        name: 'Slates - Check-in Responses',
        subscriptions: [...checkinResponseEventTypes]
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
      let user = body.user ?? body.owner ?? {};
      let checkin = body.followup ?? body.checkin ?? {};
      let response = body.response ?? body;

      let eventSuffix = ctx.input.eventType.split('.').pop() ?? 'unknown';

      return {
        type: `checkin_response.${eventSuffix}`,
        id: `${ctx.input.hookId}-${ctx.input.eventTimestamp}-${response.uuid ?? ctx.input.eventTimestamp}`,
        output: {
          checkinUuid: checkin.uuid ?? checkin.id,
          checkinName: checkin.name,
          responseUuid: response.uuid ?? response.id,
          userUuid: user.uuid ?? user.id,
          userName: user.full_name ?? user.name,
          isAnonymous: response.is_anonymous ?? checkin.is_anonymous,
          hasBlocker: response.has_blocker ?? response.is_blocker,
          completedAt: response.completed_at ?? response.created_at,
          answers: response.answers ?? response.questions,
          raw: ctx.input.body
        }
      };
    }
  })
  .build();
