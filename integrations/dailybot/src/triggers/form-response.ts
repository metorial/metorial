import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

let formResponseEventTypes = [
  'forms.response.created',
  'forms.response.updated',
  'forms.response.deleted'
] as const;

export let formResponseTrigger = SlateTrigger.create(spec, {
  name: 'Form Response',
  key: 'form_response',
  description:
    'Triggered when a form response is created, updated, or deleted. Anonymous responses will not include user information.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of form response event'),
      eventTimestamp: z.string().describe('Timestamp of the event'),
      hookId: z.string().describe('ID of the webhook'),
      hookName: z.string().optional().describe('Name of the webhook'),
      body: z.any().describe('Event payload body')
    })
  )
  .output(
    z.object({
      formUuid: z.string().optional().describe('UUID of the form'),
      formName: z.string().optional().describe('Name of the form'),
      responseUuid: z.string().optional().describe('UUID of the response'),
      userUuid: z.string().optional().describe('UUID of the responding user'),
      userName: z.string().optional().describe('Name of the responding user'),
      isAnonymous: z.boolean().optional().describe('Whether the response is anonymous'),
      answers: z.array(z.any()).optional().describe('List of question/answer pairs'),
      raw: z.any().describe('Full event body')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DailyBotClient({ token: ctx.auth.token });

      let result = await client.createWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        name: 'Slates - Form Responses',
        subscriptions: [...formResponseEventTypes]
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
      let form = body.form ?? {};
      let response = body.response ?? body;

      let eventSuffix = ctx.input.eventType.split('.').pop() ?? 'unknown';

      return {
        type: `form_response.${eventSuffix}`,
        id: `${ctx.input.hookId}-${ctx.input.eventTimestamp}-${response.uuid ?? ctx.input.eventTimestamp}`,
        output: {
          formUuid: form.uuid ?? form.id,
          formName: form.name,
          responseUuid: response.uuid ?? response.id,
          userUuid: user.uuid ?? user.id,
          userName: user.full_name ?? user.name,
          isAnonymous: response.is_anonymous ?? form.is_anonymous,
          answers: response.answers ?? response.questions,
          raw: ctx.input.body
        }
      };
    }
  })
  .build();
