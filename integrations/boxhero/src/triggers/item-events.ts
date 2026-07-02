import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let attributeSchema = z.object({
  attributeId: z.number().describe('Attribute ID'),
  name: z.string().describe('Attribute name'),
  type: z.string().describe('Attribute data type (text, number, date, barcode)'),
  value: z.union([z.string(), z.number(), z.null()]).describe('Attribute value')
});

let webhookPayloadSchema = z.object({
  eventId: z.string().describe('Unique webhook event ID'),
  topic: z.string().describe('Event topic (item/new, item/edit, item/delete)'),
  version: z.number().describe('Payload schema version'),
  createdTime: z.string().describe('When the event was created (ISO 8601)'),
  itemId: z.number().describe('Item ID'),
  name: z.string().optional().describe('Item name'),
  sku: z.string().optional().describe('Stock Keeping Unit code'),
  barcode: z.string().optional().describe('Barcode number'),
  photoUrl: z.string().nullable().optional().describe('URL of the item photo'),
  cost: z.string().nullable().optional().describe('Purchase cost'),
  price: z.string().nullable().optional().describe('Selling price'),
  attributes: z.array(attributeSchema).optional().describe('Custom attributes')
});

export let itemEvents = SlateTrigger.create(spec, {
  name: 'Item Events',
  key: 'item_events',
  description:
    'Triggered when inventory items are created, edited, or deleted in BoxHero. Not triggered for bulk operations (Add Item Variants, Data Center bulk edits, Excel imports/deletions).'
})
  .input(webhookPayloadSchema)
  .output(
    z.object({
      itemId: z.number().describe('Item ID'),
      name: z.string().optional().describe('Item name'),
      sku: z.string().optional().describe('SKU code'),
      barcode: z.string().optional().describe('Barcode number'),
      photoUrl: z.string().nullable().optional().describe('Photo URL'),
      cost: z.string().nullable().optional().describe('Purchase cost'),
      price: z.string().nullable().optional().describe('Selling price'),
      attributes: z.array(attributeSchema).optional().describe('Custom attributes')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as {
        id: string;
        topic: string;
        version: number;
        created_time: string;
        payload: {
          id: number;
          name?: string;
          sku?: string;
          barcode?: string;
          photo_url?: string | null;
          cost?: string | null;
          price?: string | null;
          attrs?: {
            id: number;
            name: string;
            type: string;
            value: string | number | null;
          }[];
        };
      };

      let payload = data.payload;

      return {
        inputs: [
          {
            eventId: String(data.id),
            topic: data.topic,
            version: data.version,
            createdTime: data.created_time,
            itemId: payload.id,
            name: payload.name,
            sku: payload.sku,
            barcode: payload.barcode,
            photoUrl: payload.photo_url,
            cost: payload.cost,
            price: payload.price,
            attributes: payload.attrs?.map(attr => ({
              attributeId: attr.id,
              name: attr.name,
              type: attr.type,
              value: attr.value
            }))
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let topicMap: Record<string, string> = {
        'item/new': 'item.created',
        'item/edit': 'item.updated',
        'item/delete': 'item.deleted'
      };

      let eventType = topicMap[ctx.input.topic] || `item.${ctx.input.topic}`;

      return {
        type: eventType,
        id: `${ctx.input.eventId}-${ctx.input.itemId}`,
        output: {
          itemId: ctx.input.itemId,
          name: ctx.input.name,
          sku: ctx.input.sku,
          barcode: ctx.input.barcode,
          photoUrl: ctx.input.photoUrl,
          cost: ctx.input.cost,
          price: ctx.input.price,
          attributes: ctx.input.attributes
        }
      };
    }
  })
  .build();
