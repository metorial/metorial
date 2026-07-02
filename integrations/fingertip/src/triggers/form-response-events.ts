import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let formResponseEvents = SlateTrigger.create(spec, {
  name: 'Form Response Events',
  key: 'form_response_events',
  description: 'Triggers when a new form submission is received on a site.'
})
  .input(
    z.object({
      eventType: z.literal('form_response.created'),
      eventId: z.string(),
      timestamp: z.number(),
      formResponse: z.any()
    })
  )
  .output(
    z.object({
      formResponseId: z.string(),
      formTemplateId: z.string().nullable(),
      siteId: z.string().nullable(),
      submittedAt: z.string(),
      fields: z.any().nullable()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FingertipClient(ctx.auth.token);
      let result = await client.createWebhook(ctx.input.webhookBaseUrl, [
        { eventType: 'form_response.created' }
      ]);

      return {
        registrationDetails: { webhookId: result.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FingertipClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as {
        id: string;
        created: number;
        type: string;
        data: any;
      };

      return {
        inputs: [
          {
            eventType: 'form_response.created' as const,
            eventId: data.id,
            timestamp: data.created,
            formResponse: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let formResponse = ctx.input.formResponse;

      return {
        type: 'form_response.created',
        id: ctx.input.eventId,
        output: {
          formResponseId: formResponse.id ?? ctx.input.eventId,
          formTemplateId: formResponse.formTemplateId ?? null,
          siteId: formResponse.siteId ?? null,
          submittedAt:
            formResponse.createdAt ?? new Date(ctx.input.timestamp * 1000).toISOString(),
          fields: formResponse.fields ?? formResponse.responses ?? formResponse
        }
      };
    }
  })
  .build();
