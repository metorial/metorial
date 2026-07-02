import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let searchWaivers = SlateTool.create(spec, {
  name: 'Search Waivers',
  key: 'search_waivers',
  description: `Search for signed waivers using keywords. Returns matching waiver records. You can also search by reference IDs to find waivers linked to external booking/reservation systems — use the reference ID fields to match against up to 3 reference ID slots, or search across all slots at once.`,
  instructions: [
    'Use "terms" for keyword-based searches across waiver data.',
    'Use the reference ID fields (refId1, refId2, refId3) to search specific reference ID slots, or use refIdAny to match any slot.',
    'Provide either search terms or at least one reference ID — not both.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      terms: z.string().optional().describe('Keywords to search for across waiver data'),
      refId1: z.string().optional().describe('Search the first reference ID field'),
      refId2: z.string().optional().describe('Search the second reference ID field'),
      refId3: z.string().optional().describe('Search the third reference ID field'),
      refIdAny: z.string().optional().describe('Search across all three reference ID fields')
    })
  )
  .output(
    z.object({
      waivers: z.any().describe('Array of matching waiver records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let hasRefId =
      ctx.input.refId1 || ctx.input.refId2 || ctx.input.refId3 || ctx.input.refIdAny;

    let waivers: any;
    if (hasRefId) {
      waivers = await client.getWaiversByReferenceID({
        refId1: ctx.input.refId1,
        refId2: ctx.input.refId2,
        refId3: ctx.input.refId3,
        refIdAny: ctx.input.refIdAny
      });
    } else if (ctx.input.terms) {
      waivers = await client.searchWaivers(ctx.input.terms);
    } else {
      throw new Error(
        'Provide either search terms or at least one reference ID to search for waivers.'
      );
    }

    let results = Array.isArray(waivers) ? waivers : [waivers];

    return {
      output: { waivers: results },
      message: `Found **${results.length}** matching waiver(s).`
    };
  })
  .build();
