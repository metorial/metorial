import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchGoogle = SlateTool.create(spec, {
  name: 'Search Google',
  key: 'search_google',
  description: `Extract structured Google search results (SERP) for a given query. Returns organic results, ad results, and rich metadata including titles, links, snippets, and ranking positions. Useful for SEO analysis, market research, and competitive intelligence.`,
  instructions: [
    'Use **tld** to target a specific Google domain (e.g. ".co.uk", ".de", ".ca").',
    'Use **country** for localized search results from a specific region.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      query: z.string().describe('The search query to look up on Google'),
      tld: z
        .string()
        .optional()
        .describe('Google top-level domain (e.g. ".com", ".co.uk", ".de", ".ca")'),
      country: z
        .string()
        .optional()
        .describe('Country code for localized search results (e.g. "us", "gb", "de")')
    })
  )
  .output(
    z.object({
      results: z
        .record(z.string(), z.unknown())
        .describe('Structured Google SERP data including organic results, ads, and metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.searchGoogle({
      query: ctx.input.query,
      tld: ctx.input.tld,
      country: ctx.input.country
    });

    return {
      output: { results },
      message: `Retrieved Google search results for **"${ctx.input.query}"**${ctx.input.country ? ` (country: ${ctx.input.country})` : ''}${ctx.input.tld ? ` (tld: ${ctx.input.tld})` : ''}.`
    };
  })
  .build();
