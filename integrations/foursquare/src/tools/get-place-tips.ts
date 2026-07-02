import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tipSchema = z.object({
  tipId: z.string().optional().describe('Tip ID'),
  createdAt: z.string().optional().describe('Tip creation timestamp'),
  text: z.string().optional().describe('Tip text content'),
  lang: z.string().optional().describe('Language code of the tip'),
  agreeCount: z.number().optional().describe('Number of agree votes'),
  disagreeCount: z.number().optional().describe('Number of disagree votes')
});

export let getPlaceTips = SlateTool.create(spec, {
  name: 'Get Place Tips',
  key: 'get_place_tips',
  description: `Retrieve tips and reviews for a specific place. Tips are user-submitted text reviews that provide insight about the venue experience.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fsqId: z.string().describe('Foursquare place ID'),
      limit: z.number().optional().describe('Maximum number of tips (default 10)'),
      sort: z.enum(['popular', 'newest']).optional().describe('Sort order for tips'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      tips: z.array(tipSchema).describe('List of tips/reviews for the place')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPlaceTips(ctx.input.fsqId, {
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      offset: ctx.input.offset
    });

    let tips = (Array.isArray(result) ? result : []).map((tip: any) => ({
      tipId: tip.id,
      createdAt: tip.created_at,
      text: tip.text,
      lang: tip.lang,
      agreeCount: tip.agree_count,
      disagreeCount: tip.disagree_count
    }));

    return {
      output: { tips },
      message: `Retrieved **${tips.length}** tip(s) for place ${ctx.input.fsqId}.`
    };
  })
  .build();
