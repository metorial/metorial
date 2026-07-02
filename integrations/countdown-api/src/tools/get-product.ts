import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product Details',
  key: 'get_product',
  description: `Retrieve detailed product information from eBay. Look up products by eBay Product ID (EPID), GTIN/ISBN/UPC/EAN code, or a direct eBay product page URL. Returns comprehensive product data including title, price, condition, images, seller info, shipping, returns policy, and auction status.`,
  instructions: [
    'Provide one of: `epid` with `ebayDomain`, a `gtin` code with `ebayDomain`, or a direct `url` to an eBay product page.',
    'GTIN lookups are cached for 2 months. Use `skipGtinCache` to force a fresh lookup (costs 2 credits).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ebayDomain: z
        .enum([
          'ebay.com',
          'ebay.co.uk',
          'ebay.com.au',
          'ebay.at',
          'ebay.be',
          'befr.ebay.be',
          'benl.ebay.be',
          'ebay.ca',
          'ebay.fr',
          'ebay.de',
          'ebay.com.hk',
          'ebay.ie',
          'ebay.it',
          'ebay.com.my',
          'ebay.nl',
          'ebay.ph',
          'ebay.pl',
          'ebay.com.sg',
          'ebay.es',
          'ebay.ch'
        ])
        .optional()
        .describe(
          'eBay domain to retrieve the product from. Defaults to configured domain. Ignored if url is provided.'
        ),
      epid: z.string().optional().describe('eBay Product ID (EPID) to look up.'),
      gtin: z
        .string()
        .optional()
        .describe(
          'GTIN, ISBN, UPC, or EAN code to look up. Automatically converted to an EPID.'
        ),
      url: z
        .string()
        .optional()
        .describe(
          'Direct URL to an eBay product page. Takes precedence over epid and ebayDomain.'
        ),
      skipGtinCache: z
        .boolean()
        .optional()
        .describe(
          'Force a fresh GTIN-to-EPID lookup instead of using the 2-month cache. Costs 2 credits.'
        ),
      includePartsCompatibility: z
        .boolean()
        .optional()
        .describe(
          'Include parts compatibility data. Only for ebay.com and ebay.co.uk. Costs 2 credits.'
        )
    })
  )
  .output(
    z.object({
      product: z
        .any()
        .describe(
          'Full product data including title, price, condition, images, attributes, seller info, shipping, returns, and more.'
        ),
      isMaster: z
        .boolean()
        .optional()
        .describe(
          'Whether this is a master product page (summary of all listings) or an individual listing.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CountdownClient({ token: ctx.auth.token });
    let ebayDomain = ctx.input.ebayDomain || ctx.config.ebayDomain;

    let result = await client.getProduct({
      ebayDomain,
      epid: ctx.input.epid,
      gtin: ctx.input.gtin,
      url: ctx.input.url,
      skipGtinCache: ctx.input.skipGtinCache,
      includePartsCompatibility: ctx.input.includePartsCompatibility
    });

    let product = result.product || {};
    let title = product.title || 'Unknown product';

    return {
      output: {
        product,
        isMaster: product.is_master
      },
      message: `Retrieved product details for **${title}**${product.buybox_winner?.price?.value ? ` - Price: ${product.buybox_winner.price.currency_symbol}${product.buybox_winner.price.value}` : ''}.`
    };
  })
  .build();
