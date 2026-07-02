import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let itemEventInputSchema = z.object({
  eventType: z.string().describe('The item event type'),
  orderId: z.string().describe('The order ID this event relates to'),
  userId: z.string().optional().describe('The Connect user ID'),
  lineNum: z.string().optional().describe('Item line number'),
  itemName: z.string().optional().describe('Item name'),
  replacementLineNum: z.string().optional().describe('Replacement item line number'),
  replacementName: z.string().optional().describe('Replacement item name'),
  timestamp: z.string().optional().describe('When the event occurred'),
  rawPayload: z.any().describe('Full raw event payload')
});

export let itemEvents = SlateTrigger.create(spec, {
  name: 'Item Events',
  key: 'item_events',
  description:
    'Receives webhook notifications for item-level events during the picking process, including item_found, item_replaced, item_refunded, and item_not_picked. Configure the webhook URL in the Instacart Developer Dashboard.'
})
  .input(itemEventInputSchema)
  .output(
    z.object({
      orderId: z.string().describe('The order ID'),
      userId: z.string().optional().describe('The Connect user ID'),
      lineNum: z.string().optional().describe('Item line number'),
      itemName: z.string().optional().describe('Item name'),
      replacementLineNum: z
        .string()
        .optional()
        .describe('Replacement item line number, if replaced'),
      replacementName: z.string().optional().describe('Replacement item name, if replaced'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.event || data.event_type || data.type || 'unknown') as string;
      let orderId = (data.order_id || '') as string;
      let userId = data.user_id as string | undefined;
      let lineNum = data.line_num as string | undefined;
      let itemName = data.item_name as string | undefined;
      let replacementLineNum = data.replacement_line_num as string | undefined;
      let replacementName = data.replacement_name as string | undefined;
      let timestamp = (data.timestamp || data.created_at) as string | undefined;

      let events = data.events as Record<string, unknown>[] | undefined;
      if (events && Array.isArray(events)) {
        return {
          inputs: events.map(evt => ({
            eventType: (evt.event || evt.event_type || evt.type || 'unknown') as string,
            orderId: (evt.order_id || '') as string,
            userId: evt.user_id as string | undefined,
            lineNum: evt.line_num as string | undefined,
            itemName: evt.item_name as string | undefined,
            replacementLineNum: evt.replacement_line_num as string | undefined,
            replacementName: evt.replacement_name as string | undefined,
            timestamp: (evt.timestamp || evt.created_at) as string | undefined,
            rawPayload: evt
          }))
        };
      }

      return {
        inputs: [
          {
            eventType,
            orderId,
            userId,
            lineNum,
            itemName,
            replacementLineNum,
            replacementName,
            timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeNormalized = ctx.input.eventType.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      return {
        type: `item.${eventTypeNormalized}`,
        id: `${ctx.input.orderId}_${ctx.input.lineNum || 'unknown'}_${eventTypeNormalized}_${ctx.input.timestamp || Date.now()}`,
        output: {
          orderId: ctx.input.orderId,
          userId: ctx.input.userId,
          lineNum: ctx.input.lineNum,
          itemName: ctx.input.itemName,
          replacementLineNum: ctx.input.replacementLineNum,
          replacementName: ctx.input.replacementName,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
