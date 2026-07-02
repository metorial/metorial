import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let locationSchema = z.object({
  locationId: z.number().describe('Location ID'),
  name: z.string().describe('Location name'),
  deleted: z.boolean().optional().describe('Whether the location has been deleted')
});

let transactionItemSchema = z.object({
  itemId: z.number().describe('Item ID'),
  name: z.string().describe('Item name'),
  quantity: z.number().describe('Transaction quantity'),
  deleted: z.boolean().optional().describe('Whether the item has been deleted'),
  toLocationNewStockLevel: z
    .number()
    .optional()
    .describe('Stock level at destination after transaction'),
  fromLocationNewStockLevel: z
    .number()
    .optional()
    .describe('Stock level at source after transaction')
});

let memberSchema = z.object({
  memberId: z.number().describe('Team member ID'),
  name: z.string().describe('Team member name'),
  deleted: z.boolean().optional().describe('Whether the member has been deleted')
});

let webhookPayloadSchema = z.object({
  eventId: z.string().describe('Unique webhook event ID'),
  topic: z.string().describe('Event topic (txs/new, txs/edit, txs/delete)'),
  version: z.number().describe('Payload schema version'),
  createdTime: z.string().describe('When the event was created (ISO 8601)'),
  transactionId: z.number().describe('Transaction ID'),
  type: z.string().optional().describe('Transaction type: in, out, adjust, move'),
  fromLocation: locationSchema.optional().describe('Source location'),
  toLocation: locationSchema.optional().describe('Destination location'),
  items: z.array(transactionItemSchema).optional().describe('Items in the transaction'),
  transactionTime: z.string().optional().describe('When the transaction occurred (ISO 8601)'),
  createdAt: z.string().optional().describe('When the transaction was created (ISO 8601)'),
  createdBy: memberSchema.optional().describe('Member who created the transaction'),
  countOfItems: z.number().optional().describe('Number of distinct items'),
  totalQuantity: z.number().optional().describe('Total quantity across all items'),
  url: z.string().optional().describe('Link to the transaction in BoxHero'),
  revision: z.number().optional().describe('Revision number (present for edit/delete events)')
});

export let transactionEvents = SlateTrigger.create(spec, {
  name: 'Transaction Events',
  key: 'transaction_events',
  description:
    'Triggered when inventory transactions are created, edited, or deleted in BoxHero. Covers Stock In, Stock Out, Adjust Stock, and Move Stock events. Not triggered for bulk edits or Excel imports.'
})
  .input(webhookPayloadSchema)
  .output(
    z.object({
      transactionId: z.number().describe('Transaction ID'),
      type: z.string().optional().describe('Transaction type: in, out, adjust, move'),
      fromLocation: locationSchema.optional().describe('Source location'),
      toLocation: locationSchema.optional().describe('Destination location'),
      items: z.array(transactionItemSchema).optional().describe('Items in the transaction'),
      transactionTime: z
        .string()
        .optional()
        .describe('When the transaction occurred (ISO 8601)'),
      createdAt: z.string().optional().describe('When the transaction was created (ISO 8601)'),
      createdBy: memberSchema.optional().describe('Member who created the transaction'),
      countOfItems: z.number().optional().describe('Number of distinct items'),
      totalQuantity: z.number().optional().describe('Total quantity'),
      url: z.string().optional().describe('Link to the transaction in BoxHero'),
      revision: z.number().optional().describe('Revision number')
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
          type?: string;
          from_location?: { id: number; name: string; deleted?: boolean };
          to_location?: { id: number; name: string; deleted?: boolean };
          items?: {
            id: number;
            name: string;
            quantity: number;
            deleted?: boolean;
            to_location_new_stock_level?: number;
            from_location_new_stock_level?: number;
          }[];
          transaction_time?: string;
          created_at?: string;
          created_by?: { id: number; name: string; deleted?: boolean };
          count_of_items?: number;
          total_quantity?: number;
          url?: string;
          revision?: number;
          partner?: { id: number; name: string; deleted?: boolean };
          memo?: string;
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
            transactionId: payload.id,
            type: payload.type,
            fromLocation: payload.from_location
              ? {
                  locationId: payload.from_location.id,
                  name: payload.from_location.name,
                  deleted: payload.from_location.deleted
                }
              : undefined,
            toLocation: payload.to_location
              ? {
                  locationId: payload.to_location.id,
                  name: payload.to_location.name,
                  deleted: payload.to_location.deleted
                }
              : undefined,
            items: payload.items?.map(item => ({
              itemId: item.id,
              name: item.name,
              quantity: item.quantity,
              deleted: item.deleted,
              toLocationNewStockLevel: item.to_location_new_stock_level,
              fromLocationNewStockLevel: item.from_location_new_stock_level
            })),
            transactionTime: payload.transaction_time,
            createdAt: payload.created_at,
            createdBy: payload.created_by
              ? {
                  memberId: payload.created_by.id,
                  name: payload.created_by.name,
                  deleted: payload.created_by.deleted
                }
              : undefined,
            countOfItems: payload.count_of_items,
            totalQuantity: payload.total_quantity,
            url: payload.url,
            revision: payload.revision
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let topicMap: Record<string, string> = {
        'txs/new': 'transaction.created',
        'txs/edit': 'transaction.updated',
        'txs/delete': 'transaction.deleted'
      };

      let eventType = topicMap[ctx.input.topic] || `transaction.${ctx.input.topic}`;

      return {
        type: eventType,
        id: `${ctx.input.eventId}-${ctx.input.transactionId}`,
        output: {
          transactionId: ctx.input.transactionId,
          type: ctx.input.type,
          fromLocation: ctx.input.fromLocation,
          toLocation: ctx.input.toLocation,
          items: ctx.input.items,
          transactionTime: ctx.input.transactionTime,
          createdAt: ctx.input.createdAt,
          createdBy: ctx.input.createdBy,
          countOfItems: ctx.input.countOfItems,
          totalQuantity: ctx.input.totalQuantity,
          url: ctx.input.url,
          revision: ctx.input.revision
        }
      };
    }
  })
  .build();
