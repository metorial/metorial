import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    itemId: z.number(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    unitCost: z.any().optional(),
    inventory: z.string().nullable().optional(),
    sku: z.string().nullable().optional(),
    tax1: z.number().nullable().optional(),
    tax2: z.number().nullable().optional()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let manageItems = SlateTool.create(spec, {
  name: 'Manage Items',
  key: 'manage_items',
  description: `Create, update, or delete billable items in FreshBooks. Items are reusable products/services with predefined names, descriptions, and rates that can be quickly added to invoices.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...scopeInput,
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
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('manage_items', ctx, outputSchema))
  .build();
