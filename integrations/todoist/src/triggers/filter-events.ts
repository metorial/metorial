import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let filterEventInput = z.object({
  eventName: z.string().describe('Todoist event name'),
  deliveryId: z.string().describe('Unique delivery ID'),
  eventData: z.any().describe('Raw filter event data')
});

let filterOutput = z.object({
  filterId: z.string().describe('Filter ID'),
  name: z.string().describe('Filter name'),
  query: z.string().optional().describe('Filter query expression'),
  color: z.string().optional().describe('Filter color'),
  order: z.number().optional().describe('Filter order'),
  isFavorite: z.boolean().optional().describe('Whether filter is favorited')
});

let eventNameToType: Record<string, string> = {
  'filter:added': 'filter.created',
  'filter:updated': 'filter.updated',
  'filter:deleted': 'filter.deleted'
};

export let filterEvents = SlateTrigger.create(spec, {
  name: 'Filter Events',
  key: 'filter_events',
  description: 'Triggers when filters are created, updated, or deleted in Todoist.'
})
  .input(filterEventInput)
  .output(filterOutput)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event_name || '';
      let deliveryId = ctx.request.headers.get('X-Todoist-Delivery-ID') || `${Date.now()}`;

      let validEvents = ['filter:added', 'filter:updated', 'filter:deleted'];
      if (!validEvents.includes(eventName)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventName,
            deliveryId,
            eventData: body.event_data || body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.eventData;
      let type = eventNameToType[ctx.input.eventName] || 'filter.unknown';

      return {
        type,
        id: ctx.input.deliveryId,
        output: {
          filterId: String(data.id || ''),
          name: data.name || '',
          query: data.query,
          color: data.color,
          order: data.item_order ?? data.order,
          isFavorite: data.is_favorite
        }
      };
    }
  });
