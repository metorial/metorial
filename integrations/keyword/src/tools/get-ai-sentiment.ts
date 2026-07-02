import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAiSentiment = SlateTool.create(spec, {
  name: 'Get AI Sentiment Analysis',
  key: 'get_ai_sentiment',
  description: `Retrieve sentiment analytics for an AI Visibility domain. Shows how AI search engines perceive and present your brand, including brand sentiment aggregates, keyword clouds, and engine-specific sentiment breakdowns. Filter by topics or search terms.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('AI Visibility domain ID'),
      topics: z.array(z.string()).optional().describe('Filter sentiment by specific topics'),
      searchTerms: z
        .array(z.string())
        .optional()
        .describe('Filter sentiment by specific search queries')
    })
  )
  .output(
    z.object({
      sentiment: z
        .any()
        .describe(
          'Sentiment analysis including brand aggregates, keyword clouds, and engine-specific breakdowns'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getAiSentiment({
      domainId: ctx.input.domainId,
      topics: ctx.input.topics,
      searchTerms: ctx.input.searchTerms
    });

    return {
      output: { sentiment: data },
      message: `Retrieved AI sentiment analysis for domain **${ctx.input.domainId}**.`
    };
  })
  .build();
