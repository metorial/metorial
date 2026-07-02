import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let labelEventInput = z.object({
  eventName: z.string().describe('Todoist event name'),
  deliveryId: z.string().describe('Unique delivery ID'),
  eventData: z.any().describe('Raw label event data')
});

let labelOutput = z.object({
  labelId: z.string().describe('Label ID'),
  name: z.string().describe('Label name'),
  color: z.string().optional().describe('Label color'),
  order: z.number().optional().describe('Label order'),
  isFavorite: z.boolean().optional().describe('Whether label is favorited')
});

let eventNameToType: Record<string, string> = {
  'label:added': 'label.created',
  'label:updated': 'label.updated',
  'label:deleted': 'label.deleted'
};

export let labelEvents = SlateTrigger.create(spec, {
  name: 'Label Events',
  key: 'label_events',
  description: 'Triggers when labels are created, updated, or deleted in Todoist.'
})
  .input(labelEventInput)
  .output(labelOutput)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event_name || '';
      let deliveryId = ctx.request.headers.get('X-Todoist-Delivery-ID') || `${Date.now()}`;

      let validEvents = ['label:added', 'label:updated', 'label:deleted'];
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
      let type = eventNameToType[ctx.input.eventName] || 'label.unknown';

      return {
        type,
        id: ctx.input.deliveryId,
        output: {
          labelId: String(data.id || ''),
          name: data.name || '',
          color: data.color,
          order: data.item_order ?? data.order,
          isFavorite: data.is_favorite
        }
      };
    }
  });
