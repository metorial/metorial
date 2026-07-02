import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categoryEnum = z
  .enum(['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'])
  .describe('News category');

let sourceSchema = z.object({
  sourceId: z.string().describe('Unique identifier for the source, usable in other tools'),
  name: z.string().describe('Display name of the news source'),
  description: z.string().describe('Brief description of the news source'),
  url: z.string().describe('URL of the source homepage'),
  category: z.string().describe('Category the source falls under'),
  language: z.string().describe('Language the source publishes in (ISO-639-1)'),
  country: z.string().describe('Country the source is based in (ISO 3166-1)')
});

export let discoverSources = SlateTool.create(spec, {
  name: 'Discover Sources',
  key: 'discover_sources',
  description: `Find available news sources and publishers. Returns source identifiers that can be used to filter results in the **Search Articles** and **Top Headlines** tools. Filter sources by category, language, or country.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      category: categoryEnum.optional().describe('Filter sources by category.'),
      language: z
        .string()
        .optional()
        .describe(
          'Filter sources by 2-letter ISO-639-1 language code (e.g. "en", "de", "fr").'
        ),
      country: z
        .string()
        .optional()
        .describe(
          'Filter sources by 2-letter ISO 3166-1 country code (e.g. "us", "gb", "de").'
        )
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
      category: ctx.input.category,
      language: ctx.input.language,
      country: ctx.input.country
    });

    let sources = result.sources.map(s => ({
      sourceId: s.id,
      name: s.name,
      description: s.description,
      url: s.url,
      category: s.category,
      language: s.language,
      country: s.country
    }));

    let filterParts: string[] = [];
    if (ctx.input.category) filterParts.push(`category: ${ctx.input.category}`);
    if (ctx.input.language) filterParts.push(`language: ${ctx.input.language}`);
    if (ctx.input.country) filterParts.push(`country: ${ctx.input.country}`);

    let filterDesc = filterParts.length > 0 ? ` matching ${filterParts.join(', ')}` : '';

    return {
      output: {
        sources
      },
      message: `Found **${sources.length}** news sources${filterDesc}.`
    };
  })
  .build();
