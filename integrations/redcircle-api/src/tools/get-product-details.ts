import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProductDetails = SlateTool.create(spec, {
  name: 'Get Product Details',
  key: 'get_product_details',
  description: `Retrieve detailed information for a specific Target product including title, description, pricing, availability, fulfillment options, images, videos, specifications, ratings, reviews, seller info, and variants. Products can be looked up by TCIN, DPCI, GTIN/UPC/ISBN, or Target product page URL.`,
  instructions: [
    'Provide exactly one identifier: tcin, dpci, gtin, or url.',
    'GTIN lookups also work with UPC and ISBN numbers.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tcin: z.string().optional().describe('Target TCIN (item ID) for the product.'),
      dpci: z.string().optional().describe('Target DPCI code for the product.'),
      gtin: z
        .string()
        .optional()
        .describe('GTIN, UPC, or ISBN to look up. RedCircle will auto-convert to TCIN.'),
      url: z
        .string()
        .optional()
        .describe('Target product page URL. Overrides other identifiers.'),
      skipGtinCache: z
        .boolean()
        .optional()
        .describe(
          'Force a fresh GTIN lookup instead of using cache. Costs 2 credits instead of 1.'
        ),
      customerZipcode: z
        .string()
        .optional()
        .describe('US zipcode to localize availability and fulfillment options.')
    })
  )
  .output(
    z.object({
      product: z
        .any()
        .describe(
          'Full product details including title, brand, pricing, images, specifications, variants, and buybox winner.'
        ),
      locationInfo: z
        .any()
        .optional()
        .describe('Location-specific info when a zipcode is used.'),
      requestInfo: z
        .any()
        .optional()
        .describe('Request metadata including credits used and remaining.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.tcin) params.tcin = ctx.input.tcin;
    if (ctx.input.dpci) params.dpci = ctx.input.dpci;
    if (ctx.input.gtin) params.gtin = ctx.input.gtin;
    if (ctx.input.url) params.url = ctx.input.url;
    if (ctx.input.skipGtinCache !== undefined)
      params.skip_gtin_cache = ctx.input.skipGtinCache;

    let zipcode = ctx.input.customerZipcode || ctx.config.customerZipcode;
    if (zipcode) params.customer_zipcode = zipcode;

    let data = await client.getProduct(params);

    let title = data.product?.title ?? 'Unknown';
    let price = data.product?.buybox_winner?.price?.value;

    return {
      output: {
        product: data.product,
        locationInfo: data.location_info,
        requestInfo: data.request_info
      },
      message: `Retrieved product: **${title}**${price !== undefined ? ` — $${price}` : ''}.`
    };
  })
  .build();
