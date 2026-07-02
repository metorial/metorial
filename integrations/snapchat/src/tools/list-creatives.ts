import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

let creativeSchema = z.object({
  creativeId: z.string().describe('Unique ID of the creative'),
  name: z.string().optional().describe('Creative name'),
  type: z.string().optional().describe('Creative type'),
  headline: z.string().optional().describe('Headline text'),
  brandName: z.string().optional().describe('Brand name'),
  callToAction: z.string().optional().describe('Call-to-action text'),
  topSnapMediaId: z.string().optional().describe('Top snap media ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listCreatives = SlateTool.create(spec, {
  name: 'List Creatives',
  key: 'list_creatives',
  description: `List all creatives under a Snapchat ad account. Returns creative IDs, names, types, headlines, and media associations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adAccountId: z.string().describe('Ad account ID to list creatives for'),
      limit: z
        .number()
        .int()
        .min(50)
        .max(1000)
        .optional()
        .describe('Maximum number of creatives to return, from 50 to 1000'),
      cursor: z.string().optional().describe('Pagination cursor from a previous nextLink')
    })
  )
  .output(
    z.object({
      creatives: z.array(creativeSchema).describe('List of creatives'),
      nextLink: z
        .string()
        .optional()
        .describe('Pagination URL for the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let result = await client.listCreatives(
      ctx.input.adAccountId,
      ctx.input.limit,
      ctx.input.cursor
    );

    let creatives = result.items.map((c: any) => ({
      creativeId: c.id,
      name: c.name,
      type: c.type,
      headline: c.headline,
      brandName: c.brand_name,
      callToAction: c.call_to_action,
      topSnapMediaId: c.top_snap_media_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { creatives, nextLink: result.nextLink },
      message: `Found **${creatives.length}** creative(s).`
    };
  })
  .build();
