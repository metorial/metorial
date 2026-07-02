import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAiCitations = SlateTool.create(spec, {
  name: 'Get AI Citations',
  key: 'get_ai_citations',
  description: `Retrieve citation analytics for an AI Visibility domain. Shows which URLs and domains are being cited by AI search engines, with engine-specific breakdowns, brand analysis, and competitor comparisons. Useful for understanding your content's authority in AI search results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('AI Visibility domain ID'),
      topics: z.array(z.string()).optional().describe('Filter citations by specific topics'),
      searchTerms: z
        .array(z.string())
        .optional()
        .describe('Filter citations by specific search queries')
    })
  )
  .output(
    z.object({
      citations: z
        .any()
        .describe(
          'Citation metrics including domain/URL aggregations, engine breakdowns, brand analysis, and competitor comparisons'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getAiCitations({
      domainId: ctx.input.domainId,
      topics: ctx.input.topics,
      searchTerms: ctx.input.searchTerms
    });

    return {
      output: { citations: data },
      message: `Retrieved AI citation analytics for domain **${ctx.input.domainId}**.`
    };
  })
  .build();
