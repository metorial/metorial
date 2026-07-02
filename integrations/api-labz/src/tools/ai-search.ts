import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let aiSearch = SlateTool.create(spec, {
  name: 'AI Search',
  key: 'ai_search',
  description: `Run AI-powered search queries that return comprehensive, contextual search results. Unlike traditional search, this provides synthesized and analyzed results with relevant context.

Useful for quick information lookups, fact-checking, and getting contextual answers to specific questions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'The search query, e.g. "What are the latest developments in quantum computing?"'
        )
    })
  )
  .output(
    z.object({
      searchResults: z
        .any()
        .describe('AI-powered search results with contextual and comprehensive information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Running AI search...');

    let result = await client.aiSearch({
      query: ctx.input.query
    });

    return {
      output: {
        searchResults: result
      },
      message: `Successfully completed AI search for: "${ctx.input.query}"`
    };
  })
  .build();
