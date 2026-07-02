import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `List all items (products) available for sale in the Gift Up! checkout. Optionally filter by item group.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().optional().describe('Filter items by group ID')
    })
  )
  .output(
    z.object({
      items: z.array(
        z
          .object({
            itemId: z.string().describe('Item ID'),
            name: z.string().describe('Item name'),
            description: z.string().nullable().describe('Description'),
            backingType: z.string().describe('Currency or Units'),
            priceType: z.string().nullable().describe('Specified or Custom'),
            price: z.number().nullable().describe('Price'),
            value: z.number().nullable().describe('Gift card value'),
            units: z.number().nullable().describe('Units'),
            stockLevel: z.number().nullable().describe('Stock level'),
            sku: z.string().nullable().describe('SKU'),
            groupId: z.string().nullable().describe('Group ID')
          })
          .passthrough()
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let items = await client.listItems({ groupId: ctx.input.groupId });

    let mapped = (Array.isArray(items) ? items : []).map((item: any) => ({
      ...item,
      itemId: item.id
    }));

    return {
      output: { items: mapped },
      message: `Found **${mapped.length}** items${ctx.input.groupId ? ' in the specified group' : ''}`
    };
  })
  .build();
