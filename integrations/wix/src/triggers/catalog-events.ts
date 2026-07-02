import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let catalogEvents = SlateTrigger.create(spec, {
  name: 'Catalog Events',
  key: 'catalog_events',
  description:
    'Triggers on product catalog events including product created/updated/deleted, collection created/updated/deleted, and inventory changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of catalog event'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().describe('ID of the affected resource (product, collection)'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      productId: z.string().optional().describe('Product ID if applicable'),
      collectionId: z.string().optional().describe('Collection ID if applicable'),
      productName: z.string().optional().describe('Product name'),
      productType: z.string().optional().describe('Product type (physical/digital)'),
      visible: z.boolean().optional().describe('Whether the product is visible'),
      price: z.string().optional().describe('Product price'),
      currency: z.string().optional().describe('Currency code'),
      sku: z.string().optional().describe('Product SKU'),
      inventoryQuantity: z
        .number()
        .optional()
        .describe('Inventory quantity if inventory event'),
      rawPayload: z.any().optional().describe('Complete raw event data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let eventType = data.eventType || data.type || 'unknown';
      let eventId = data.eventId || `${data.instanceId}-${Date.now()}`;
      let payload = data.data || data;

      let resourceId =
        payload.product?.id ||
        payload.collection?.id ||
        payload.productId ||
        payload.collectionId ||
        eventId;

      return {
        inputs: [
          {
            eventType,
            eventId,
            resourceId,
            payload
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let product = payload.product || payload;
      let collection = payload.collection;

      let type = ctx.input.eventType.toLowerCase().replace(/\//g, '.').replace(/\s+/g, '_');
      if (!type.includes('.')) {
        type = `catalog.${type}`;
      }

      return {
        type,
        id: ctx.input.eventId,
        output: {
          productId: product?.id || payload.productId,
          collectionId: collection?.id || payload.collectionId,
          productName: product?.name,
          productType: product?.productType,
          visible: product?.visible,
          price: product?.priceData?.price?.toString() || product?.price?.toString(),
          currency: product?.priceData?.currency,
          sku: product?.sku,
          inventoryQuantity: payload.inventoryItem?.trackQuantity
            ? payload.inventoryItem?.quantity
            : undefined,
          rawPayload: payload
        }
      };
    }
  })
  .build();
