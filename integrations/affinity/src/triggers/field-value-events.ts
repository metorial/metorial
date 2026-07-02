import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let fieldValueEvents = SlateTrigger.create(spec, {
  name: 'Field Value Events',
  key: 'field_value_events',
  description:
    'Triggers when a field value (custom data) is created, updated, or deleted on any entity in Affinity. Does not include enrichment field value updates.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of event (field_value.created, field_value.updated, field_value.deleted)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      sentAt: z.string().nullable().describe('When the event was sent'),
      body: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      fieldValueId: z.number().describe('ID of the field value'),
      fieldId: z.number().nullable().describe('ID of the field'),
      entityId: z.number().nullable().describe('ID of the entity'),
      listEntryId: z.number().nullable().describe('ID of the list entry'),
      value: z.any().describe('The field value')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      let result = await client.createWebhook({
        webhookUrl: ctx.input.webhookBaseUrl,
        subscriptions: ['field_value.created', 'field_value.updated', 'field_value.deleted']
      });
      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let type = data.type as string;
      if (!type?.startsWith('field_value.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: type,
            eventId: `${type}-${data.body?.id ?? ''}-${data.sent_at ?? Date.now()}`,
            sentAt: data.sent_at ?? null,
            body: data.body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let body = ctx.input.body ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          fieldValueId: body.id ?? 0,
          fieldId: body.field_id ?? null,
          entityId: body.entity_id ?? null,
          listEntryId: body.list_entry_id ?? null,
          value: body.value ?? null
        }
      };
    }
  })
  .build();
