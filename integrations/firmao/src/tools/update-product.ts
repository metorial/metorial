import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product or service in Firmao. Modify name, pricing, stock levels, and other attributes. Stock level modification requires the "Direct modification of stock levels" setting to be enabled.`
})
  .input(
    z.object({
      productId: z.number().describe('ID of the product to update'),
      name: z.string().optional().describe('Updated product name'),
      productCode: z.string().optional().describe('Updated product code'),
      saleable: z.boolean().optional().describe('Updated saleable status'),
      purchaseNetPrice: z.number().optional().describe('Updated purchase net price'),
      purchaseGrossPrice: z.number().optional().describe('Updated purchase gross price'),
      saleNetPrice: z.number().optional().describe('Updated sale net price'),
      saleGrossPrice: z.number().optional().describe('Updated sale gross price'),
      currentStoreState: z
        .number()
        .optional()
        .describe('Updated stock level (requires org setting enabled)'),
      unit: z.string().optional().describe('Updated unit')
    })
  )
  .output(
    z.object({
      productId: z.number(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {};

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.productCode) body.productCode = ctx.input.productCode;
    if (ctx.input.saleable !== undefined) body.saleable = ctx.input.saleable;
    if (ctx.input.unit) body.unit = ctx.input.unit;
    if (ctx.input.currentStoreState !== undefined)
      body.currentStoreState = ctx.input.currentStoreState;
    if (ctx.input.purchaseNetPrice !== undefined)
      body['purchasePriceGroup.netPrice'] = ctx.input.purchaseNetPrice;
    if (ctx.input.purchaseGrossPrice !== undefined)
      body['purchasePriceGroup.grossPrice'] = ctx.input.purchaseGrossPrice;
    if (ctx.input.saleNetPrice !== undefined)
      body['salePriceGroup.netPrice'] = ctx.input.saleNetPrice;
    if (ctx.input.saleGrossPrice !== undefined)
      body['salePriceGroup.grossPrice'] = ctx.input.saleGrossPrice;

    await client.update('products', ctx.input.productId, body);

    return {
      output: {
        productId: ctx.input.productId,
        updated: true
      },
      message: `Updated product ID **${ctx.input.productId}**.`
    };
  })
  .build();
