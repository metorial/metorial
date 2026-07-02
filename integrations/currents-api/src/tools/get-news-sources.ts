import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sourceSchema = z.object({
  sourceId: z.string().describe('Unique identifier of the news source'),
  name: z.string().describe('Name of the news source'),
  description: z.string().describe('Description of the news source'),
  url: z.string().describe('Website URL of the news source'),
  categories: z.array(z.string()).describe('Categories covered by this source'),
  languages: z.array(z.string()).describe('Languages supported by this source')
});

export let getNewsSources = SlateTool.create(spec, {
  name: 'Get News Sources',
  key: 'get_news_sources',
  description: `Retrieve a list of available news sources. Can be filtered by language and category to find relevant sources for specific regions or topics. Useful for discovering which news sources are available and understanding the coverage of the API.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      language: z
        .string()
        .optional()
        .describe('Language code to filter sources (e.g., "en", "es", "fr")'),
      category: z
        .string()
        .optional()
        .describe('Category to filter sources (e.g., "technology", "business", "sports")')
    })
  )
  .output(
    z.object({
      sources: z.array(sourceSchema).describe('List of available news sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSources({
      language: ctx.input.language,
      category: ctx.input.category
    });

    let sources = (result.sources || []).map(source => ({
      sourceId: source.id || '',
      name: source.name || '',
      description: source.description || '',
      url: source.url || '',
      categories: source.category || [],
      languages: source.language || []
    }));

    let filterParts: string[] = [];
    if (ctx.input.language) filterParts.push(`language: ${ctx.input.language}`);
    if (ctx.input.category) filterParts.push(`category: ${ctx.input.category}`);
    let filterDesc = filterParts.length > 0 ? ` (filtered by ${filterParts.join(', ')})` : '';

    return {
      output: {
        sources
      },
      message: `Retrieved **${sources.length}** news sources${filterDesc}.`
    };
  })
  .build();
