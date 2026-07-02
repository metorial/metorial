import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product's attributes such as name, description, pricing, SEO fields, and visibility flags. Only the provided fields will be updated.`
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to update'),
      name: z.string().optional().describe('Updated product name'),
      description: z
        .string()
        .optional()
        .describe('Updated product description (HTML supported)'),
      urlHandle: z.string().optional().describe('Updated URL slug'),
      seoTitle: z.string().optional().describe('Updated SEO title'),
      seoDescription: z.string().optional().describe('Updated SEO meta description'),
      priceType: z.string().optional().describe('Updated price type'),
      individualPrice: z.any().optional().describe('Updated individual price'),
      active: z.boolean().optional().describe('Set product active/inactive'),
      draft: z.boolean().optional().describe('Set product as draft or published'),
      digital: z.boolean().optional().describe('Set product as digital'),
      shipping: z.boolean().optional().describe('Set whether shipping is required'),
      sale: z.boolean().optional().describe('Set product on sale'),
      featured: z.boolean().optional().describe('Set product as featured'),
      tracking: z.boolean().optional().describe('Enable/disable inventory tracking'),
      threshold: z.number().optional().describe('Low stock threshold for alerts')
    })
  )
  .output(
    z.object({
      productId: z.string(),
      name: z.string().optional(),
      dateModified: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let attributes: Record<string, any> = {};
    if (ctx.input.name !== undefined) attributes.name = ctx.input.name;
    if (ctx.input.description !== undefined) attributes.description = ctx.input.description;
    if (ctx.input.urlHandle !== undefined) attributes.url_handle = ctx.input.urlHandle;
    if (ctx.input.seoTitle !== undefined) attributes.seo_title = ctx.input.seoTitle;
    if (ctx.input.seoDescription !== undefined)
      attributes.seo_description = ctx.input.seoDescription;
    if (ctx.input.priceType !== undefined) attributes.price_type = ctx.input.priceType;
    if (ctx.input.individualPrice !== undefined)
      attributes.individual_price = ctx.input.individualPrice;
    if (ctx.input.active !== undefined) attributes.active = ctx.input.active;
    if (ctx.input.draft !== undefined) attributes.draft = ctx.input.draft;
    if (ctx.input.digital !== undefined) attributes.digital = ctx.input.digital;
    if (ctx.input.shipping !== undefined) attributes.shipping = ctx.input.shipping;
    if (ctx.input.sale !== undefined) attributes.sale = ctx.input.sale;
    if (ctx.input.featured !== undefined) attributes.featured = ctx.input.featured;
    if (ctx.input.tracking !== undefined) attributes.tracking = ctx.input.tracking;
    if (ctx.input.threshold !== undefined) attributes.threshold = ctx.input.threshold;

    let res = await client.updateProduct(ctx.input.productId, attributes);
    let p = res.data;

    return {
      output: {
        productId: p.id,
        name: p.attributes.name,
        dateModified: p.attributes.date_modified
      },
      message: `Updated product **${p.attributes.name || p.id}**.`
    };
  })
  .build();
