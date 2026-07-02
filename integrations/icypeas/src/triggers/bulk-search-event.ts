import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let bulkSearchEvent = SlateTrigger.create(spec, {
  name: 'Bulk Search Event',
  key: 'bulk_search_event',
  description:
    'Receives webhook notifications for bulk search events, including per-item results and bulk search completion summaries.'
})
  .input(
    z.object({
      eventType: z
        .enum(['item_processed', 'bulk_completed'])
        .describe('Type of bulk search event'),
      signature: z.string().optional().describe('HMAC-SHA1 signature from the webhook'),
      timestamp: z.string().optional().describe('Timestamp from the webhook payload'),
      eventData: z.any().describe('The event data payload')
    })
  )
  .output(
    z.object({
      searchId: z.string().optional().describe('ID of the individual search item'),
      bulkSearchId: z.string().optional().describe('ID of the bulk search'),
      status: z.string().optional().describe('Status of the search or bulk operation'),
      email: z.string().optional().describe('Found or verified email address'),
      certainty: z.string().optional().describe('Confidence level of the result'),
      firstname: z.string().optional().describe('First name if found'),
      lastname: z.string().optional().describe('Last name if found'),
      externalId: z.string().optional().describe('Custom external ID if provided'),
      raw: z.any().optional().describe('Full event payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let data = body?.data || body;
      let signature = body?.signature;
      let timestamp = body?.timestamp;

      // Determine event type based on payload structure
      // Item processed events contain individual search results
      // Bulk completed events contain summary statistics
      let isBulkDone =
        data?.finished !== undefined || data?.stats !== undefined || data?.status === 'done';
      let eventType: 'item_processed' | 'bulk_completed' = isBulkDone
        ? 'bulk_completed'
        : 'item_processed';

      return {
        inputs: [
          {
            eventType,
            signature,
            timestamp,
            eventData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.eventData;

      let searchId = data?._id || data?.searchId || data?.id;
      let bulkSearchId = data?.fileId || data?.bulkId || data?.file;
      let eventId = searchId || bulkSearchId || `${ctx.input.timestamp || Date.now()}`;

      return {
        type: `bulk_search.${ctx.input.eventType}`,
        id: eventId,
        output: {
          searchId,
          bulkSearchId,
          status: data?.status,
          email: data?.email,
          certainty: data?.certainty,
          firstname: data?.firstname,
          lastname: data?.lastname,
          externalId: data?.externalId,
          raw: data
        }
      };
    }
  })
  .build();
