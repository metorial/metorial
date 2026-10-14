import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description:
    'List available scraping countries and ISO codes. Use an ISO code when selecting a manual location for ad-hoc extraction.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      locations: z.array(
        z.object({
          countryName: z.string().describe('Country name'),
          isoCode: z.string().describe('ISO country code for manual scraping location')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });
    let result = await client.listLocations();
    if (!Array.isArray(result.locations)) {
      throw createApiServiceError(
        'Kadoa returned an invalid location list. Try listing locations again.'
      );
    }
    return {
      output: {
        locations: result.locations.map((location: any) => ({
          countryName: location.countryName,
          isoCode: location.isoCode
        }))
      },
      message: `Found **${result.locations.length}** available scraping location(s).`
    };
  })
  .build();
