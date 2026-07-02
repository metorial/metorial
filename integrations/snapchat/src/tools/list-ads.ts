import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

let adSchema = z.object({
  adId: z.string().describe('Unique ID of the ad'),
  adSquadId: z.string().optional().describe('Parent ad squad ID'),
  creativeId: z.string().optional().describe('Associated creative ID'),
  name: z.string().optional().describe('Ad name'),
  status: z.string().optional().describe('Ad status'),
  type: z.string().optional().describe('Ad type'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listAds = SlateTool.create(spec, {
  name: 'List Ads',
  key: 'list_ads',
  description: `List all ads under a Snapchat ad squad. Returns ad IDs, names, statuses, creative associations, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adSquadId: z.string().describe('Ad squad ID to list ads for'),
      limit: z
        .number()
        .int()
        .min(50)
        .max(1000)
        .optional()
        .describe('Maximum number of ads to return, from 50 to 1000'),
      cursor: z.string().optional().describe('Pagination cursor from a previous nextLink')
    })
  )
  .output(
    z.object({
      ads: z.array(adSchema).describe('List of ads'),
      nextLink: z
        .string()
        .optional()
        .describe('Pagination URL for the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let result = await client.listAds(ctx.input.adSquadId, ctx.input.limit, ctx.input.cursor);

    let ads = result.items.map((a: any) => ({
      adId: a.id,
      adSquadId: a.ad_squad_id,
      creativeId: a.creative_id,
      name: a.name,
      status: a.status,
      type: a.type,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: { ads, nextLink: result.nextLink },
      message: `Found **${ads.length}** ad(s).`
    };
  })
  .build();
