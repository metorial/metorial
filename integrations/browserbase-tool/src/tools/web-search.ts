import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Search the web using Browserbase Search and return structured result metadata that can be passed to fetch_page or browser sessions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().min(1).max(200).describe('Search query string'),
      numResults: z
        .number()
        .int()
        .min(1)
        .max(25)
        .optional()
        .describe('Number of results to return (1-25). Defaults to 10.')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Browserbase search request identifier'),
      query: z.string().describe('Search query that was executed'),
      results: z
        .array(
          z.object({
            resultId: z.string().describe('Search result identifier'),
            url: z.string().describe('Result URL'),
            title: z.string().describe('Result title'),
            author: z.string().optional().describe('Result author, when available'),
            publishedDate: z.string().optional().describe('Published date, when available'),
            image: z.string().optional().describe('Preview image URL, when available'),
            favicon: z.string().optional().describe('Favicon URL, when available')
          })
        )
        .describe('Structured search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let search = await client.webSearch({
      query: ctx.input.query,
      numResults: ctx.input.numResults
    });

    return {
      output: search,
      message: `Found **${search.results.length}** result(s) for **${search.query}**.`
    };
  })
  .build();
