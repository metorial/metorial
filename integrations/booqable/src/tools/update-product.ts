import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product group's details including name, SKU, pricing, description, and store visibility. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      productGroupId: z.string().describe('The unique ID of the product group to update'),
      name: z.string().optional().describe('Updated product name'),
      sku: z.string().optional().describe('Updated SKU'),
      basePriceInCents: z.number().optional().describe('Updated base price in cents'),
      priceType: z
        .enum(['simple', 'flat_fee', 'structure'])
        .optional()
        .describe('Updated pricing method'),
      pricePeriod: z
        .enum(['hour', 'day', 'week', 'month'])
        .optional()
        .describe('Updated pricing period'),
      depositInCents: z.number().optional().describe('Updated deposit in cents'),
      description: z.string().optional().describe('Updated description'),
      showInStore: z.boolean().optional().describe('Updated store visibility'),
      taxCategoryId: z.string().optional().describe('Updated tax category ID'),
      tags: z.array(z.string()).optional().describe('Updated tags')
    })
  )
  .output(
    z.object({
      productGroup: z.record(z.string(), z.any()).describe('The updated product group record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let attributes: Record<string, any> = {};
    if (ctx.input.name) attributes.name = ctx.input.name;
    if (ctx.input.sku) attributes.sku = ctx.input.sku;
    if (ctx.input.basePriceInCents !== undefined)
      attributes.base_price_in_cents = ctx.input.basePriceInCents;
    if (ctx.input.priceType) attributes.price_type = ctx.input.priceType;
    if (ctx.input.pricePeriod) attributes.price_period = ctx.input.pricePeriod;
    if (ctx.input.depositInCents !== undefined)
      attributes.deposit_in_cents = ctx.input.depositInCents;
    if (ctx.input.description) attributes.description = ctx.input.description;
    if (ctx.input.showInStore !== undefined) attributes.show_in_store = ctx.input.showInStore;
    if (ctx.input.taxCategoryId) attributes.tax_category_id = ctx.input.taxCategoryId;
    if (ctx.input.tags) attributes.tags = ctx.input.tags;

    let response = await client.updateProductGroup(ctx.input.productGroupId, attributes);
    let productGroup = flattenSingleResource(response);

    return {
      output: { productGroup },
      message: `Updated product group **${productGroup?.name || ctx.input.productGroupId}**.`
    };
  })
  .build();
