import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageItem = SlateTool.create(spec, {
  name: 'Manage Item',
  key: 'manage_item',
  description: `Creates or updates an item (product or service) in Zoho Invoice. If itemId is provided, the existing item is updated; otherwise a new item is created. Items can be used across invoices, estimates, and other transactions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      itemId: z
        .string()
        .optional()
        .describe('ID of the item to update. If omitted, a new item is created.'),
      name: z.string().optional().describe('Name of the item (required when creating)'),
      rate: z
        .number()
        .optional()
        .describe('Selling price / rate of the item (required when creating)'),
      description: z.string().optional().describe('Description of the item'),
      sku: z.string().optional().describe('Stock Keeping Unit identifier'),
      productType: z
        .enum(['goods', 'service'])
        .optional()
        .describe('Whether the item is a physical good or a service'),
      taxId: z.string().optional().describe('Tax ID to apply to the item'),
      isTaxable: z.boolean().optional().describe('Whether the item is taxable')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Unique ID of the item'),
      name: z.string().optional().describe('Name of the item'),
      status: z.string().optional().describe('Current status of the item'),
      description: z.string().optional().describe('Item description'),
      rate: z.number().optional().describe('Selling price / rate'),
      sku: z.string().optional().describe('Stock Keeping Unit identifier'),
      productType: z.string().optional().describe('Product type (goods or service)'),
      isTaxable: z.boolean().optional().describe('Whether the item is taxable'),
      taxId: z.string().optional().describe('Associated tax ID'),
      taxName: z.string().optional().describe('Name of the associated tax'),
      taxPercentage: z.number().optional().describe('Tax percentage applied'),
      createdTime: z.string().optional().describe('Timestamp when the item was created'),
      lastModifiedTime: z
        .string()
        .optional()
        .describe('Timestamp when the item was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let payload: Record<string, any> = {};

    if (ctx.input.name) payload.name = ctx.input.name;
    if (ctx.input.rate !== undefined) payload.rate = ctx.input.rate;
    if (ctx.input.description) payload.description = ctx.input.description;
    if (ctx.input.sku) payload.sku = ctx.input.sku;
    if (ctx.input.productType) payload.product_type = ctx.input.productType;
    if (ctx.input.taxId) payload.tax_id = ctx.input.taxId;
    if (ctx.input.isTaxable !== undefined) payload.is_taxable = ctx.input.isTaxable;

    let item: any;

    if (ctx.input.itemId) {
      item = await client.updateItem(ctx.input.itemId, payload);
    } else {
      item = await client.createItem(payload);
    }

    let output = {
      itemId: item.item_id,
      name: item.name,
      status: item.status,
      description: item.description,
      rate: item.rate,
      sku: item.sku,
      productType: item.product_type,
      isTaxable: item.is_taxable,
      taxId: item.tax_id,
      taxName: item.tax_name,
      taxPercentage: item.tax_percentage,
      createdTime: item.created_time,
      lastModifiedTime: item.last_modified_time
    };

    let action = ctx.input.itemId ? 'Updated' : 'Created';

    return {
      output,
      message: `${action} item **${output.name}** (${output.itemId}).`
    };
  })
  .build();
