import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let listGiftcardBrands = SlateTool.create(spec, {
  name: 'List Gift Card Brands',
  key: 'list_giftcard_brands',
  description: `Retrieve all available gift card brands and their denominations. Brands are grouped by category (Featured, Food, Entertainment, Gifts, Travel, Big Box) and include brand codes, display images, and available amounts.
Use the brand code and amount when sending gift cards via the **Send Gift Card** tool.`,
  instructions: ['Set flat to true to get a flat list without category grouping.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      flat: z
        .boolean()
        .optional()
        .default(false)
        .describe('Return a flat list without category grouping')
    })
  )
  .output(
    z.object({
      brands: z.array(z.record(z.string(), z.unknown())).describe('List of gift card brands')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ThanksIoClient({ token: ctx.auth.token });
    let result = ctx.input.flat
      ? await client.listGiftcardBrandsFlat()
      : await client.listGiftcardBrands();

    let brands = (Array.isArray(result) ? result : result.data || []) as Record<
      string,
      unknown
    >[];

    return {
      output: { brands },
      message: `Retrieved **${brands.length}** gift card brand(s).`
    };
  })
  .build();
