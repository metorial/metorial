import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, quotaSchema } from '../lib/client';
import { spec } from '../spec';

export let searchNewsSourcesTool = SlateTool.create(spec, {
  name: 'Search News Sources',
  key: 'search_news_sources',
  description: `Search for available news sources monitored by the World News API. Check if a specific publication or news website is indexed and available for use in news searches. Returns matching source names, URLs, and languages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z
        .string()
        .min(3)
        .max(1000)
        .describe('Full or partial name of the news source to search for (min 3 characters)')
    })
  )
  .output(
    z.object({
      quota: quotaSchema.optional().describe('API point usage, when returned by the provider'),
      totalAvailable: z.number().describe('Total number of matching sources'),
      sources: z
        .array(
          z.object({
            sourceName: z.string().describe('Name of the news source'),
            sourceUrl: z.string().describe('URL of the news source website'),
            language: z.string().describe('ISO 639-1 language code of the source')
          })
        )
        .describe('List of matching news sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchNewsSources(ctx.input.name);

    let sources = result.sources.map(source => ({
      sourceName: source.name,
      sourceUrl: source.url,
      language: source.language
    }));

    return {
      output: {
        ...(result.quota ? { quota: result.quota } : {}),
        totalAvailable: result.available,
        sources
      },
      message: `Found **${result.available}** news source(s). Returned ${sources.length} results.`
    };
  })
  .build();
