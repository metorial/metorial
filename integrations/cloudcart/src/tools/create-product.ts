import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in the CloudCart store. Requires a product name and category ID at minimum. Optionally set pricing, descriptions, SEO fields, and visibility flags.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Product name'),
      categoryId: z.string().describe('ID of the category to assign the product to'),
      description: z.string().optional().describe('Product description (HTML supported)'),
      urlHandle: z.string().optional().describe('URL-friendly slug for the product'),
      seoTitle: z.string().optional().describe('SEO title for the product page'),
      seoDescription: z.string().optional().describe('SEO meta description'),
      priceType: z.string().optional().describe('Price type for the product'),
      individualPrice: z.any().optional().describe('Individual price value'),
      active: z.boolean().optional().describe('Whether the product is active'),
      draft: z.boolean().optional().describe('Whether the product is a draft'),
      digital: z.boolean().optional().describe('Whether the product is digital'),
      shipping: z.boolean().optional().describe('Whether the product requires shipping'),
      sale: z.boolean().optional().describe('Whether the product is on sale'),
      featured: z.boolean().optional().describe('Whether the product is featured'),
      vendorId: z.string().optional().describe('ID of the vendor for this product')
    })
  )
  .output(
    z.object({
      productId: z.string(),
      name: z.string().optional(),
      dateAdded: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let attributes: Record<string, any> = { name: ctx.input.name };
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

    let relationships: Record<string, any> = {
      category: {
        data: { type: 'categories', id: ctx.input.categoryId }
      }
    };
    if (ctx.input.vendorId) {
      relationships.vendor = {
        data: { type: 'vendors', id: ctx.input.vendorId }
      };
    }

    let res = await client.createProduct(attributes, relationships);
    let p = res.data;

    return {
      output: {
        productId: p.id,
        name: p.attributes.name,
        dateAdded: p.attributes.date_added
      },
      message: `Created product **${p.attributes.name}** (ID: ${p.id}).`
    };
  })
  .build();
