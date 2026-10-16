import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdpClient } from '../lib/idp-client';
import { spec } from '../spec';

export let getNearbyRetailers = SlateTool.create(spec, {
  name: 'Get Nearby Retailers',
  key: 'get_nearby_retailers',
  description: `Look up retailers available on Instacart Marketplace near a given postal code. Returns retailer names, keys, and logos. Retailer keys identify retailer organizations rather than individual store locations.

Requires **Developer Platform API key** authentication.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      postalCode: z.string().describe('US or Canadian postal code'),
      countryCode: z.enum(['US', 'CA']).describe('Country code for the postal code')
    })
  )
  .output(
    z.object({
      retailers: z
        .array(
          z.object({
            raw: z.unknown().optional().describe('Complete retailer data'),
            retailerKey: z
              .string()
              .optional()
              .describe('Unique retailer identifier used for filtering'),
            name: z.string().optional().describe('Retailer business name'),
            retailerLogoUrl: z.string().optional().describe('URL to the retailer logo image')
          })
        )
        .describe('List of nearby retailers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdpClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let retailers = await client.getNearbyRetailers(
      ctx.input.postalCode,
      ctx.input.countryCode
    );

    return {
      output: { retailers },
      message: `Found **${retailers.length}** retailer(s) near postal code **${ctx.input.postalCode}** (${ctx.input.countryCode}).${retailers.length > 0 ? `\n\n${retailers.map(r => `- ${r.name}`).join('\n')}` : ''}`
    };
  })
  .build();
