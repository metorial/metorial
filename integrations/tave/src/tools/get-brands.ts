import { SlateTool } from 'slates';
import { z } from 'zod';
import { TavePublicClient } from '../lib/client';
import { spec } from '../spec';

let brandSchema = z.object({
  brandId: z.string().describe('ID of the brand'),
  name: z.string().describe('Name of the brand'),
  raw: z.any().optional().describe('Full brand record')
});

export let getBrands = SlateTool.create(spec, {
  name: 'Get Brands',
  key: 'get_brands',
  description: `Retrieves the list of brands configured in the Tave account. Brands represent different business identities or product lines. Useful for discovering available brands to filter contacts, jobs, and orders. Requires the **API Key (Public API V2)** authentication method.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      brands: z.array(brandSchema).describe('List of brands in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TavePublicClient(ctx.auth.token);

    ctx.info('Fetching brands from Tave');

    let result = await client.listBrands();

    let items = Array.isArray(result) ? result : (result?.data ?? result?.brands ?? []);

    let brands = items.map((b: any) => ({
      brandId: String(b.id ?? b.brand_id ?? ''),
      name: b.name ?? b.title ?? '',
      raw: b
    }));

    return {
      output: {
        brands
      },
      message: `Retrieved **${brands.length}** brand(s) from Tave.`
    };
  })
  .build();
