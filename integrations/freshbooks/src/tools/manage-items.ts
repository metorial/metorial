import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let manageItems = SlateTool.create(spec, {
  name: 'Manage Items',
  key: 'manage_items',
  description: `Create, update, or delete billable items in FreshBooks. Items are reusable products/services with predefined names, descriptions, and rates that can be quickly added to invoices.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      itemId: z.number().optional().describe('Item ID (required for update/delete)'),
      name: z.string().optional().describe('Item name (required for create)'),
      description: z.string().optional().describe('Item description'),
      unitCost: z.string().optional().describe('Unit cost amount (e.g. "100.00")'),
      currencyCode: z.string().optional().describe('Currency code for the unit cost'),
      inventory: z.string().optional().describe('Inventory count (decimal string)'),
      sku: z.string().optional().describe('SKU identifier'),
      tax1: z.number().optional().describe('First tax ID to apply'),
      tax2: z.number().optional().describe('Second tax ID to apply')
    })
  )
  .output(
    z.object({
      itemId: z.number(),
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      unitCost: z.any().optional(),
      inventory: z.string().nullable().optional(),
      sku: z.string().nullable().optional(),
      tax1: z.number().nullable().optional(),
      tax2: z.number().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let buildPayload = () => {
      let payload: Record<string, any> = {};
      if (ctx.input.name !== undefined) payload.name = ctx.input.name;
      if (ctx.input.description !== undefined) payload.description = ctx.input.description;
      if (ctx.input.unitCost !== undefined) {
        payload.unit_cost = {
          amount: ctx.input.unitCost,
          code: ctx.input.currencyCode || 'USD'
        };
      }
      if (ctx.input.inventory !== undefined) payload.inventory = ctx.input.inventory;
      if (ctx.input.sku !== undefined) payload.sku = ctx.input.sku;
      if (ctx.input.tax1 !== undefined) payload.tax1 = ctx.input.tax1;
      if (ctx.input.tax2 !== undefined) payload.tax2 = ctx.input.tax2;
      return payload;
    };

    let mapResult = (raw: any) => ({
      itemId: raw.id || raw.itemid,
      name: raw.name,
      description: raw.description,
      unitCost: raw.unit_cost,
      inventory: raw.inventory,
      sku: raw.sku,
      tax1: raw.tax1,
      tax2: raw.tax2
    });

    if (ctx.input.action === 'create') {
      let result = await client.createItem(buildPayload());
      return {
        output: mapResult(result),
        message: `Created item **${result.name}** (ID: ${result.id || result.itemid}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.itemId) throw new Error('itemId is required for update');
      let result = await client.updateItem(ctx.input.itemId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated item **${result.name}** (ID: ${ctx.input.itemId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.itemId) throw new Error('itemId is required for delete');
      let result = await client.deleteItem(ctx.input.itemId);
      return {
        output: mapResult(result),
        message: `Archived item (ID: ${ctx.input.itemId}).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
