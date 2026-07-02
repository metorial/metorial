import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let skuSchema = z.object({
  skuId: z.string().describe('SKU identifier'),
  name: z.string().optional().describe('SKU name'),
  slug: z.string().optional().describe('SKU slug'),
  price: z.any().optional().describe('Price information'),
  compareAtPrice: z.any().optional().describe('Compare-at price'),
  width: z.number().optional(),
  height: z.number().optional(),
  length: z.number().optional(),
  weight: z.number().optional()
});

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve one Webflow ecommerce product and its SKUs by product ID. Use this before updating a product or inspecting variant data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      productId: z.string().describe('Unique identifier of the ecommerce product')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('Unique identifier for the product'),
      name: z.string().optional().describe('Product name'),
      slug: z.string().optional().describe('URL slug of the product'),
      description: z.string().optional().describe('Product description'),
      isArchived: z.boolean().optional().describe('Whether the product is archived'),
      isDraft: z.boolean().optional().describe('Whether the product is a draft'),
      shippable: z.boolean().optional().describe('Whether the product can be shipped'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp'),
      skus: z.array(skuSchema).optional().describe('Product SKUs/variants')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let data = await client.getProduct(ctx.input.siteId, ctx.input.productId);
    let p = data.product ?? data;
    let skus = (data.skus ?? []).map((s: any) => ({
      skuId: s.id ?? s._id,
      name: s.name ?? s.fieldData?.name,
      slug: s.slug ?? s.fieldData?.slug,
      price: s.fieldData?.price ?? s.price,
      compareAtPrice: s.fieldData?.['compare-at-price'] ?? s.compareAtPrice,
      width: s.fieldData?.width,
      height: s.fieldData?.height,
      length: s.fieldData?.length,
      weight: s.fieldData?.weight
    }));

    return {
      output: {
        productId: p.id ?? p._id ?? ctx.input.productId,
        name: p.fieldData?.name ?? p.name,
        slug: p.fieldData?.slug ?? p.slug,
        description: p.fieldData?.description ?? p.description,
        isArchived: p.isArchived,
        isDraft: p.isDraft,
        shippable: p.fieldData?.shippable ?? p.shippable,
        createdOn: p.createdOn,
        lastUpdated: p.lastUpdated,
        skus
      },
      message: `Retrieved product **${p.fieldData?.name ?? p.name ?? ctx.input.productId}**.`
    };
  })
  .build();
