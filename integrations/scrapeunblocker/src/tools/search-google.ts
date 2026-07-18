import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchGoogle = SlateTool.create(spec, {
  name: 'Search Google',
  key: 'search_google',
  description: `Extract Google search results for a query. Returns the organic results with their titles, links, snippets and ranking positions. Useful for SEO analysis, market research, and competitive intelligence.`,
  instructions: [
    'Use **pagesToCheck** to collect more than the first page of results.',
    'Use **proxyCountry** for country-specific results (e.g. "us", "de").'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      keyword: z.string().describe('The search query to look up on Google'),
      pagesToCheck: z
        .number()
        .optional()
        .describe('How many result pages to scrape (defaults to 1)'),
      proxyCountry: z
        .string()
        .optional()
        .describe('Two-letter country code for localized results (e.g. "us", "de")')
    })
  )
  .output(
    z.object({
      organic: z
        .array(
          z.object({
            title: z.string().optional().describe('Result title'),
            url: z.string().optional().describe('Result URL'),
            description: z.string().optional().describe('Result snippet'),
            position: z.string().optional().describe('Ranking position in the results list')
          })
        )
        .describe('Organic search results'),
      totalResults: z
        .string()
        .nullable()
        .optional()
        .describe('Total result count reported by Google, when available'),
      organicResultsCount: z
        .number()
        .optional()
        .describe('Number of organic results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.searchGoogle({
      keyword: ctx.input.keyword,
      pagesToCheck: ctx.input.pagesToCheck,
      proxyCountry: ctx.input.proxyCountry
    });

    return {
      output: results,
      message: `Retrieved **${results.organic.length}** organic Google results for **"${ctx.input.keyword}"**${ctx.input.proxyCountry ? ` (country: ${ctx.input.proxyCountry})` : ''}.`
    };
  })
  .build();
