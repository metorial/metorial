import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let kudosPostedTrigger = SlateTrigger.create(spec, {
  name: 'Kudos Posted',
  key: 'kudos_posted',
  description:
    'Triggered when kudos (peer recognition) are given to a user in the organization. Anonymous kudos will mask the giver identity.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of kudos event'),
      eventTimestamp: z.string().describe('Timestamp of the event'),
      hookId: z.string().describe('ID of the webhook'),
      hookName: z.string().optional().describe('Name of the webhook'),
      body: z.any().describe('Event payload body')
    })
  )
  .output(
    z.object({
      kudosUuid: z.string().optional().describe('UUID of the kudos'),
      giverUuid: z.string().optional().describe('UUID of the user who gave the kudos'),
      giverName: z.string().optional().describe('Name of the giver'),
      receivers: z
        .array(
          z.object({
            userUuid: z.string().optional().describe('UUID of the receiver'),
            userName: z.string().optional().describe('Name of the receiver')
          })
        )
        .optional()
        .describe('List of kudos receivers'),
      content: z.string().optional().describe('Kudos message text'),
      companyValue: z.string().optional().describe('Associated company value'),
      isAnonymous: z.boolean().optional().describe('Whether the kudos was given anonymously'),
      raw: z.any().describe('Full event body')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DailyBotClient({ token: ctx.auth.token });

      let result = await client.createWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        name: 'Slates - Kudos',
        subscriptions: ['kudos.posted']
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
            eventType: data.event ?? 'kudos.posted',
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
      let giver = body.giver ?? {};
      let rawReceivers = body.receivers ?? [];

      let receivers = rawReceivers.map((r: any) => ({
        userUuid: r.uuid ?? r.id,
        userName: r.full_name ?? r.name
      }));

      return {
        type: 'kudos.posted',
        id: `${ctx.input.hookId}-${ctx.input.eventTimestamp}-${body.uuid ?? ctx.input.eventTimestamp}`,
        output: {
          kudosUuid: body.uuid ?? body.id,
          giverUuid: giver.uuid ?? giver.id,
          giverName: giver.full_name ?? giver.name,
          receivers,
          content: body.content ?? body.message,
          companyValue: body.company_value ?? body.value,
          isAnonymous: body.is_anonymous,
          raw: ctx.input.body
        }
      };
    }
  })
  .build();
