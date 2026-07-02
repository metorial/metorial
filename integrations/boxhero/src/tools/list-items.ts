import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attributeSchema = z.object({
  attributeId: z.number().describe('Unique identifier for the attribute'),
  name: z.string().describe('Attribute name (e.g., Category, Expiration date)'),
  type: z.string().describe('Attribute data type (text, number, date, barcode)'),
  value: z.union([z.string(), z.number(), z.null()]).describe('Attribute value')
});

let itemSchema = z.object({
  itemId: z.number().describe('Unique identifier for the item'),
  name: z.string().describe('Item name'),
  sku: z.string().describe('Stock Keeping Unit code'),
  barcode: z.string().describe('Barcode number'),
  photoUrl: z.string().nullable().describe('URL of the item photo'),
  cost: z.string().nullable().describe('Purchase cost of the item'),
  price: z.string().nullable().describe('Selling price of the item'),
  quantity: z
    .number()
    .optional()
    .describe('Current stock quantity (available when filtering by location)'),
  attributes: z.array(attributeSchema).describe('Custom attributes for the item')
});

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `Retrieve inventory items from BoxHero. Supports filtering by location and pagination for large inventories. Returns item details including name, SKU, barcode, cost, price, and custom attributes.`,
  constraints: [
    'Rate limited to 5 requests per second.',
    'Returns up to 100 items per page by default.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      locationIds: z
        .array(z.number())
        .optional()
        .describe('Filter items by one or more location IDs'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of items to return per page (default 100)'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response to fetch the next page')
    })
  )
  .output(
    z.object({
      items: z.array(itemSchema).describe('List of inventory items'),
      hasMore: z.boolean().describe('Whether more items are available beyond this page'),
      cursor: z.string().optional().describe('Cursor to use for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listItems({
      locationIds: ctx.input.locationIds,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let items = response.items.map(item => ({
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      photoUrl: item.photo_url,
      cost: item.cost,
      price: item.price,
      quantity: item.quantity,
      attributes: item.attrs.map(attr => ({
        attributeId: attr.id,
        name: attr.name,
        type: attr.type,
        value: attr.value
      }))
    }));

    return {
      output: {
        items,
        hasMore: response.has_more,
        cursor: response.cursor
      },
      message: `Retrieved ${items.length} item(s).${response.has_more ? ' More items available — use the cursor to fetch the next page.' : ''}`
    };
  })
  .build();
