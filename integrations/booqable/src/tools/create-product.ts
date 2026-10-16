import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateNumber } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product group in Booqable. Product groups are the main catalog entries that contain product variations. Configure name, SKU, pricing, tracking type, and other settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the product group'),
      sku: z.string().optional().describe('SKU identifier'),
      trackable: z
        .boolean()
        .optional()
        .describe(
          'Whether individual items should be tracked (true) or counted in bulk (false)'
        ),
      basePriceInCents: z.number().optional().describe('Base rental price in cents'),
      priceType: z
        .enum(['simple', 'flat_fee', 'structure'])
        .optional()
        .describe('Pricing method; flat_fee selects fixed pricing'),
      pricePeriod: z
        .enum(['hour', 'day', 'week', 'month'])
        .optional()
        .describe('Pricing period'),
      depositInCents: z.number().optional().describe('Security deposit amount in cents'),
      description: z.string().optional().describe('Product description'),
      showInStore: z.boolean().optional().describe('Whether to show in the online store'),
      taxCategoryId: z.string().optional().describe('Tax category ID'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      priceStructureId: z
        .string()
        .optional()
        .describe('Price structure ID when using structure pricing')
    })
  )
  .output(
    z.object({
      productGroup: z
        .record(z.string(), z.any())
        .describe('The newly created product group record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    validateNumber(ctx.input.basePriceInCents, 'Base price in cents', {
      integer: true,
      min: 0
    });
    validateNumber(ctx.input.depositInCents, 'Deposit in cents', { integer: true, min: 0 });
    let currentPriceType = 'simple';

    let attributes: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.sku) attributes.sku = ctx.input.sku;
    if (ctx.input.trackable !== undefined) {
      attributes.trackable = ctx.input.trackable;
      attributes.tracking_type = ctx.input.trackable ? 'trackable' : 'bulk';
    }
    if (ctx.input.basePriceInCents !== undefined)
      attributes[
        (ctx.input.priceType ?? currentPriceType) === 'structure' ||
        currentPriceType === 'private_structure'
          ? 'structure_price_in_cents'
          : 'flat_fee_price_in_cents'
      ] = ctx.input.basePriceInCents;
    if (ctx.input.priceType)
      attributes.price_type =
        ctx.input.priceType === 'flat_fee' ? 'fixed' : ctx.input.priceType;
    if (ctx.input.pricePeriod) attributes.price_period = ctx.input.pricePeriod;
    if (ctx.input.depositInCents !== undefined)
      attributes.deposit_in_cents = ctx.input.depositInCents;
    if (ctx.input.description) attributes.description = ctx.input.description;
    if (ctx.input.showInStore !== undefined) attributes.show_in_store = ctx.input.showInStore;
    if (ctx.input.taxCategoryId) attributes.tax_category_id = ctx.input.taxCategoryId;
    if (ctx.input.tags) attributes.tag_list = ctx.input.tags;

    if (ctx.input.priceStructureId !== undefined)
      attributes.price_structure_id = ctx.input.priceStructureId;

    let response = await client.createProductGroup(attributes);
    let productGroup = flattenSingleResource(response);

    return {
      output: { productGroup },
      message: `Created product group **${productGroup?.name}**.`
    };
  })
  .build();
