import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve full details of a specific product by its ID, including relationships like category, vendor, image, and variants.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('The ID of the product to retrieve'),
      includeVariants: z
        .boolean()
        .optional()
        .describe('Whether to include product variants in the response'),
      includeCategory: z.boolean().optional().describe('Whether to include category details')
    })
  )
  .output(
    z.object({
      productId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      urlHandle: z.string().optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      priceFrom: z.any().optional(),
      priceTo: z.any().optional(),
      priceType: z.string().optional(),
      active: z.any().optional(),
      draft: z.any().optional(),
      digital: z.any().optional(),
      shipping: z.any().optional(),
      sale: z.any().optional(),
      isNew: z.any().optional(),
      featured: z.any().optional(),
      tracking: z.any().optional(),
      threshold: z.any().optional(),
      views: z.any().optional(),
      dateAdded: z.string().optional(),
      dateModified: z.string().optional(),
      publishDate: z.string().optional(),
      relationships: z.record(z.string(), z.any()).optional(),
      included: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let includes: string[] = [];
    if (ctx.input.includeVariants) includes.push('variant');
    if (ctx.input.includeCategory) includes.push('category');

    let res = await client.getProduct(
      ctx.input.productId,
      includes.length > 0 ? includes.join(',') : undefined
    );
    let p = res.data;

    return {
      output: {
        productId: p.id,
        name: p.attributes.name,
        description: p.attributes.description,
        urlHandle: p.attributes.url_handle,
        seoTitle: p.attributes.seo_title,
        seoDescription: p.attributes.seo_description,
        priceFrom: p.attributes.price_from,
        priceTo: p.attributes.price_to,
        priceType: p.attributes.price_type,
        active: p.attributes.active,
        draft: p.attributes.draft,
        digital: p.attributes.digital,
        shipping: p.attributes.shipping,
        sale: p.attributes.sale,
        isNew: p.attributes.new,
        featured: p.attributes.featured,
        tracking: p.attributes.tracking,
        threshold: p.attributes.threshold,
        views: p.attributes.views,
        dateAdded: p.attributes.date_added,
        dateModified: p.attributes.date_modified,
        publishDate: p.attributes.publish_date,
        relationships: p.relationships,
        included: res.included
      },
      message: `Retrieved product **${p.attributes.name || p.id}**.`
    };
  })
  .build();
