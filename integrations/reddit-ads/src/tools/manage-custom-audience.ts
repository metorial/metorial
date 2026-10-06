import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, invalid, resourceOutput } from '../lib/contracts';
import { audiencePayload } from '../lib/mappers';
import { spec } from '../spec';

export let manageCustomAudience = SlateTool.create(spec, {
  name: 'Manage Custom Audience',
  key: 'manage_custom_audience',
  description:
    'Create customer-list, website or engagement audiences using documented configuration. Existing audiences are readable, but metadata updates, description fields and lookalike creation are unsupported by this API.',
  instructions: [
    'Omit audienceId to create. Supplying audienceId fails clearly because no metadata-update endpoint is documented. WEBSITE maps to PIXEL_RETARGETING and ENGAGEMENT to ENGAGEMENT_RETARGETING.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountId: accountInput,
      originClientId: z
        .enum([
          'UNSPECIFIED',
          'LIVE_RAMP',
          'MPARTICLE',
          'TEALIUM',
          'OTHER',
          'LIVE_RAMP_ADVERTISER_DIRECT',
          'BOMBORA'
        ])
        .optional()
        .describe('Origin for customer-list ingestion.'),
      pixelId: z.string().optional().describe('Pixel required for WEBSITE audiences.'),
      trackingTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Standard conversion events for WEBSITE, or engagement event types for ENGAGEMENT.'
        ),
      lookbackWindowDays: z
        .number()
        .optional()
        .describe('WEBSITE: 1–90 days; ENGAGEMENT: 1–180 days.'),
      campaignIds: z
        .array(z.string())
        .optional()
        .describe('Campaign IDs required for ENGAGEMENT audiences.'),
      audienceId: z
        .string()
        .optional()
        .describe(
          'Legacy metadata-update ID; unsupported by the current API. Omit to create an audience.'
        ),
      name: z.string().optional().describe('Audience name'),
      audienceType: z
        .enum(['CUSTOMER_LIST', 'WEBSITE', 'LOOKALIKE', 'ENGAGEMENT'])
        .optional()
        .describe('Type of custom audience'),
      description: z
        .string()
        .optional()
        .describe('Legacy field unsupported by the current API; omit it.')
    })
  )
  .output(
    z.object({
      audienceId: z.string().optional(),
      name: z.string().optional(),
      audienceType: z.string().optional(),
      approximateSize: z.number().optional(),
      sizeRangeLower: z.number().optional(),
      sizeRangeUpper: z.number().optional(),
      status: z.string().optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    const payload = audiencePayload(ctx.input);
    const client = createClient(ctx);
    if (ctx.input.audienceType === 'ENGAGEMENT')
      for (const campaignId of ctx.input.campaignIds ?? [])
        await client.getResource('campaign', campaignId);
    if (ctx.input.audienceType === 'WEBSITE') {
      let page = await client.pixels({});
      const seen = new Set<string>();
      while (
        !page.items.some(pixel => pixel.id === ctx.input.pixelId) &&
        page.nextUrl !== undefined
      ) {
        if (seen.has(page.nextUrl) || seen.size >= 20)
          invalid(
            'Pixel ownership discovery exceeded its safe page limit. Select a Pixel visible in this account.'
          );
        seen.add(page.nextUrl);
        page = await client.pixels({ nextUrl: page.nextUrl });
      }
      if (!page.items.some(pixel => pixel.id === ctx.input.pixelId))
        invalid('The selected Pixel was not found in this ad account.');
    }
    const result = await client.write('audience', undefined, payload);
    return {
      output: resourceOutput('audience', result),
      message:
        'Reddit acknowledged audience creation. Size ranges and processing state may change asynchronously.'
    };
  })
  .build();
