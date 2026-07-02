import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product or service in Firmao. Set pricing for purchase and sale, stock levels, product codes, and tags.`
})
  .input(
    z.object({
      name: z.string().describe('Product/service name'),
      productCode: z.string().optional().describe('Product code identifier'),
      saleable: z.boolean().optional().describe('Whether the product is available for sale'),
      purchaseNetPrice: z.number().optional().describe('Purchase net price'),
      purchaseGrossPrice: z.number().optional().describe('Purchase gross price'),
      purchaseVat: z.number().optional().describe('Purchase VAT percentage'),
      saleNetPrice: z.number().optional().describe('Sale net price'),
      saleGrossPrice: z.number().optional().describe('Sale gross price'),
      saleVat: z.number().optional().describe('Sale VAT percentage'),
      unit: z.string().optional().describe('Unit of measure'),
      tagIds: z.array(z.number()).optional().describe('Tag IDs to apply')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('ID of the created product'),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.productCode) body.productCode = ctx.input.productCode;
    if (ctx.input.saleable !== undefined) body.saleable = ctx.input.saleable;
    if (ctx.input.unit) body.unit = ctx.input.unit;
    if (ctx.input.tagIds) body.tags = ctx.input.tagIds.map(id => ({ id }));

    if (ctx.input.purchaseNetPrice !== undefined)
      body['purchasePriceGroup.netPrice'] = ctx.input.purchaseNetPrice;
    if (ctx.input.purchaseGrossPrice !== undefined)
      body['purchasePriceGroup.grossPrice'] = ctx.input.purchaseGrossPrice;
    if (ctx.input.purchaseVat !== undefined)
      body['purchasePriceGroup.vat'] = ctx.input.purchaseVat;
    if (ctx.input.saleNetPrice !== undefined)
      body['salePriceGroup.netPrice'] = ctx.input.saleNetPrice;
    if (ctx.input.saleGrossPrice !== undefined)
      body['salePriceGroup.grossPrice'] = ctx.input.saleGrossPrice;
    if (ctx.input.saleVat !== undefined) body['salePriceGroup.vat'] = ctx.input.saleVat;

    let result = await client.create('products', body);
    let createdId = result?.changelog?.[0]?.objectId ?? result?.id;

    return {
      output: {
        productId: createdId,
        name: ctx.input.name
      },
      message: `Created product **${ctx.input.name}** (ID: ${createdId}).`
    };
  })
  .build();
