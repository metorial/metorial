import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categoryEnum = z
  .enum(['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'])
  .describe('News category');

let articleSchema = z.object({
  sourceId: z.string().nullable().describe('Identifier of the news source'),
  sourceName: z.string().describe('Display name of the news source'),
  author: z.string().nullable().describe('Author of the article'),
  title: z.string().describe('Headline or title of the article'),
  description: z.string().nullable().describe('Short description or snippet of the article'),
  url: z.string().describe('Direct URL to the full article'),
  imageUrl: z.string().nullable().describe('URL to a relevant image for the article'),
  publishedAt: z.string().describe('Date and time the article was published (ISO 8601)'),
  content: z.string().nullable().describe('First 200 characters of the article content')
});

export let topHeadlines = SlateTool.create(spec, {
  name: 'Top Headlines',
  key: 'top_headlines',
  description: `Retrieve live top and breaking news headlines. Filter by country, category, specific sources, or search with keywords. Ideal for monitoring current news in specific regions or topic areas. You cannot combine the **country** or **category** filters with the **sources** filter.`,
  instructions: [
    'Provide at least one of: country, category, sources, or query.',
    'The country and category parameters cannot be used together with sources.'
  ],
  constraints: [
    'Article content is truncated to 200 characters.',
    'Maximum 100 results per page.',
    'Cannot mix country/category with sources parameter.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Keywords or phrases to search for in headlines.'),
      country: z
        .string()
        .optional()
        .describe(
          '2-letter ISO 3166-1 country code (e.g. "us", "gb", "de"). Cannot be used with sources.'
        ),
      category: categoryEnum
        .optional()
        .describe('Category to filter headlines. Cannot be used with sources.'),
      sources: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of source identifiers (e.g. "bbc-news,cnn"). Cannot be used with country or category.'
        ),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default 20).'),
      page: z.number().min(1).optional().describe('Page number to retrieve (default 1).')
    })
  )
  .output(
    z.object({
      totalResults: z.number().describe('Total number of matching headlines'),
      articles: z.array(articleSchema).describe('List of headline articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTopHeadlines({
      q: ctx.input.query,
      country: ctx.input.country,
      category: ctx.input.category,
      sources: ctx.input.sources,
      pageSize: ctx.input.pageSize,
      page: ctx.input.page
    });

    let articles = result.articles.map(a => ({
      sourceId: a.source.id,
      sourceName: a.source.name,
      author: a.author,
      title: a.title,
      description: a.description,
      url: a.url,
      imageUrl: a.urlToImage,
      publishedAt: a.publishedAt,
      content: a.content
    }));

    let filterParts: string[] = [];
    if (ctx.input.country) filterParts.push(`country: ${ctx.input.country}`);
    if (ctx.input.category) filterParts.push(`category: ${ctx.input.category}`);
    if (ctx.input.sources) filterParts.push(`sources: ${ctx.input.sources}`);
    if (ctx.input.query) filterParts.push(`query: "${ctx.input.query}"`);

    let filterDesc = filterParts.length > 0 ? ` for ${filterParts.join(', ')}` : '';

    return {
      output: {
        totalResults: result.totalResults,
        articles
      },
      message: `Found **${result.totalResults}** headlines${filterDesc}. Returned **${articles.length}** results.`
    };
  })
  .build();
