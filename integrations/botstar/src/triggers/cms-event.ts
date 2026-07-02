import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let cmsEvent = SlateTrigger.create(spec, {
  name: 'CMS Item Created',
  key: 'cms_item_created',
  description: `Triggers when a new CMS item is created in a BotStar entity. Configure in Bot Builder > Integrations by selecting the "New CMS Item" event type.`,
  instructions: [
    'In BotStar, go to Bot Builder > Integrations, select "New CMS Item", and paste the webhook URL.',
    'Supports both Live and Test environment modes.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('Type of event'),
      eventId: z.string().describe('Unique ID for deduplication'),
      entityId: z.string().optional().describe('ID of the CMS entity'),
      entityName: z.string().optional().describe('Name of the CMS entity'),
      itemId: z.string().optional().describe('ID of the created item'),
      itemName: z.string().optional().describe('Name of the created item'),
      botId: z.string().optional().describe('ID of the bot'),
      environment: z.string().optional().describe('Environment mode (live or test)'),
      itemFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field values of the item'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('ID of the CMS entity'),
      entityName: z.string().optional().describe('Name of the CMS entity'),
      itemId: z.string().describe('ID of the created item'),
      itemName: z.string().optional().describe('Name of the item'),
      botId: z.string().optional().describe('ID of the bot'),
      environment: z.string().optional().describe('Environment mode'),
      itemFields: z.record(z.string(), z.any()).optional().describe('Field values of the item')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.type || data.event_type || 'new_cms_item';
      let entityId = data.entity_id || data.entityId || data.entity?.id || '';
      let entityName = data.entity_name || data.entityName || data.entity?.name || '';
      let itemId = data.item_id || data.itemId || data.item?.id || '';
      let itemName = data.item_name || data.itemName || data.item?.name || data.name || '';
      let botId = data.bot_id || data.botId || data.bot?.id || '';
      let environment = data.environment || data.env || '';

      let itemFields: Record<string, any> = {};
      if (data.item?.fields) {
        itemFields = data.item.fields;
      } else if (data.fields) {
        itemFields = data.fields;
      } else if (data.item) {
        let { id, _id, name, entity_id, ...rest } = data.item;
        itemFields = rest;
      }

      let eventId = data.id || data.event_id || `${eventType}-${itemId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            entityId,
            entityName,
            itemId,
            itemName,
            botId,
            environment,
            itemFields,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'cms_item.created',
        id: ctx.input.eventId,
        output: {
          entityId: ctx.input.entityId || '',
          entityName: ctx.input.entityName,
          itemId: ctx.input.itemId || '',
          itemName: ctx.input.itemName,
          botId: ctx.input.botId,
          environment: ctx.input.environment,
          itemFields: ctx.input.itemFields
        }
      };
    }
  })
  .build();
