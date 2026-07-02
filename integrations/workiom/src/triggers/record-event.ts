import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let recordEvent = SlateTrigger.create(spec, {
  name: 'Record Event',
  key: 'record_event',
  description:
    'Triggers when a record is created or updated in a Workiom list. Configure a webhook subscription in Workiom (or use the Create Webhook Subscription tool) pointing to the webhook URL, then this trigger will process incoming record events.',
  instructions: [
    'Use the Create Webhook Subscription tool or the Workiom UI to register a webhook pointing at this trigger URL.',
    'Set eventType 0 for record created, or eventType 1 for record updated.'
  ]
})
  .input(
    z.object({
      appId: z.string().describe('ID of the app containing the list'),
      listId: z.string().describe('ID of the list where the event occurred'),
      eventType: z.enum(['created', 'updated']).describe('Type of record event'),
      record: z.any().describe('The record data from the webhook payload')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('ID of the app'),
      listId: z.string().describe('ID of the list'),
      recordId: z.string().optional().describe('ID of the affected record'),
      record: z.any().describe('The full record data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let record = data?.record ?? data?.data ?? data;
      let appId = String(data?.appId ?? '');
      let listId = String(data?.listId ?? '');
      let rawEventType = data?.eventType;

      let eventType: 'created' | 'updated' = rawEventType === 1 ? 'updated' : 'created';

      return {
        inputs: [
          {
            appId,
            listId,
            eventType,
            record
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let recordId = ctx.input.record?._id ?? ctx.input.record?.id ?? '';

      return {
        type: `record.${ctx.input.eventType}`,
        id: `${ctx.input.listId}-${recordId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          appId: ctx.input.appId,
          listId: ctx.input.listId,
          recordId: recordId ? String(recordId) : undefined,
          record: ctx.input.record
        }
      };
    }
  })
  .build();
