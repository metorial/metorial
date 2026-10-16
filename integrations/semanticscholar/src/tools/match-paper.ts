import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { paperFiltersSchema } from './search-papers-bulk';

export let matchPaper = SlateTool.create(spec, {
  key: 'match_paper',
  name: 'Match Paper Title',
  description:
    'Find the single paper whose title most closely matches a query. Returns the provider match score and requested metadata; no match produces a provider error.',
  tags: { readOnly: true }
})
  .input(paperFiltersSchema.extend({ query: z.string().describe('Paper title to match.') }))
  .output(
    z.object({
      papers: z
        .array(
          z
            .object({ paperId: z.string().nullable(), matchScore: z.number().optional() })
            .passthrough()
        )
        .describe('At most one closest matching paper.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).matchPaper(ctx.input);
    return {
      output: { papers: result.data },
      message: `Retrieved **${result.data.length}** title matches.`
    };
  })
  .build();
