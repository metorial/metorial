import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pinterestServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getTerms = SlateTool.create(spec, {
  name: 'Get Terms',
  key: 'get_terms',
  description: `Retrieve Pinterest search term ideas. Use related terms to expand a topic and suggested terms to find popular completions that start with a term.`,
  instructions: [
    'Set mode to "related" and provide terms to get logically related search phrases.',
    'Set mode to "suggested" and provide term to get popular search completions.',
    'Suggested terms support a limit between 1 and 10.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z.enum(['related', 'suggested']).describe('Term lookup mode'),
      terms: z.array(z.string()).optional().describe('Input terms for related term lookup'),
      term: z.string().optional().describe('Input term for suggested term lookup'),
      limit: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Maximum suggested terms to return (max 10)')
    })
  )
  .output(
    z.object({
      terms: z.any().describe('Terms response returned by Pinterest')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'related') {
      let terms = ctx.input.terms ?? [];
      if (terms.length === 0) {
        throw pinterestServiceError('At least one term is required for related term lookup');
      }

      let result = await client.getRelatedTerms(terms);

      return {
        output: {
          terms: result
        },
        message: `Retrieved related terms for **${terms.join(', ')}**.`
      };
    }

    if (!ctx.input.term) {
      throw pinterestServiceError('A term is required for suggested term lookup');
    }

    let result = await client.getSuggestedTerms(ctx.input.term, ctx.input.limit);

    return {
      output: {
        terms: result
      },
      message: `Retrieved suggested terms for **${ctx.input.term}**.`
    };
  })
  .build();
