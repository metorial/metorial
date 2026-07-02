import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let newsArticleSchema = z.object({
  articleId: z.number().describe('Unique ID of the news article'),
  title: z.string().describe('Headline of the article'),
  text: z.string().describe('Full text content of the article'),
  summary: z.string().describe('Short summary of the article'),
  url: z.string().describe('URL to the original article'),
  image: z.string().nullable().describe('URL of the main article image'),
  video: z.string().nullable().describe('URL of the associated video'),
  publishDate: z.string().describe('ISO date when the article was published'),
  authors: z.array(z.string()).describe('List of article authors'),
  category: z
    .string()
    .nullable()
    .describe('Article category (e.g. politics, sports, technology)'),
  language: z.string().describe('ISO 639-1 language code'),
  sourceCountry: z.string().describe('ISO 3166 country code of the news source'),
  sentiment: z
    .number()
    .nullable()
    .describe('Sentiment score from -1 (negative) to +1 (positive)')
});

export let searchNewsTool = SlateTool.create(spec, {
  name: 'Search News',
  key: 'search_news',
  description: `Search and filter news articles from thousands of sources across 210+ countries and 86+ languages. Supports keyword search, semantic entity matching (e.g. \`ORG:Tesla\`, \`PER:Elon Musk\`, \`Location:USA\`), date range filtering, sentiment filtering, geo-located search by coordinates and radius, and filtering by category, language, source country, author, and news source. Results can be sorted by relevance or publish time.`,
  instructions: [
    'At least one filter is required — provide either **text**, **language**, or another filter parameter.',
    'Use **entities** for semantic matching: e.g. `ORG:Tesla`, `PER:Elon Musk`, `LOC:Berlin`.',
    'Use **locationFilter** for geo-based search in the format `latitude,longitude,radiusKm` (1–100 km).',
    'Categories: politics, sports, business, technology, entertainment, health, science, lifestyle, travel, culture, education, environment, other.'
  ],
  constraints: [
    'Maximum 100 results per request.',
    'Text must be 3–100 characters.',
    'Offset maximum is 100,000.',
    'Sentiment analysis is only available for English and German articles.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z
        .string()
        .min(3)
        .max(100)
        .optional()
        .describe('Keywords to match in news content (3–100 characters)'),
      textMatchIndexes: z
        .string()
        .optional()
        .describe('Where to search: "title", "content", or "title,content"'),
      sourceCountry: z
        .string()
        .optional()
        .describe('ISO 3166 country code of news source (e.g. "us", "gb", "de")'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-1 language code (e.g. "en", "de", "fr")'),
      minSentiment: z
        .number()
        .min(-1)
        .max(1)
        .optional()
        .describe('Minimum sentiment score (-1 to 1)'),
      maxSentiment: z
        .number()
        .min(-1)
        .max(1)
        .optional()
        .describe('Maximum sentiment score (-1 to 1)'),
      earliestPublishDate: z
        .string()
        .optional()
        .describe('Earliest publish date (e.g. "2024-01-15" or "2024-01-15 10:00:00")'),
      latestPublishDate: z
        .string()
        .optional()
        .describe('Latest publish date (e.g. "2024-06-01" or "2024-06-01 23:59:59")'),
      newsSources: z
        .string()
        .optional()
        .describe('Comma-separated news source URLs (e.g. "https://www.bbc.co.uk")'),
      authors: z.string().optional().describe('Comma-separated author names'),
      categories: z
        .string()
        .optional()
        .describe('Comma-separated categories (e.g. "politics,sports,technology")'),
      entities: z
        .string()
        .optional()
        .describe('Semantic entity filter (e.g. "ORG:Tesla,PER:Elon Musk")'),
      locationFilter: z
        .string()
        .optional()
        .describe('Geo filter: "latitude,longitude,radiusKm" (e.g. "51.509865,-0.118092,15")'),
      sort: z.enum(['relevance', 'publish-time']).optional().describe('Sort order'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      offset: z.number().min(0).max(100000).optional().describe('Number of results to skip'),
      maxResults: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results to return (1–100, default 10)')
    })
  )
  .output(
    z.object({
      offset: z.number().describe('Current offset in the result set'),
      totalAvailable: z.number().describe('Total number of matching articles'),
      articles: z.array(newsArticleSchema).describe('List of matching news articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchNews({
      text: ctx.input.text,
      textMatchIndexes: ctx.input.textMatchIndexes,
      sourceCountry: ctx.input.sourceCountry,
      language: ctx.input.language,
      minSentiment: ctx.input.minSentiment,
      maxSentiment: ctx.input.maxSentiment,
      earliestPublishDate: ctx.input.earliestPublishDate,
      latestPublishDate: ctx.input.latestPublishDate,
      newsSources: ctx.input.newsSources,
      authors: ctx.input.authors,
      categories: ctx.input.categories,
      entities: ctx.input.entities,
      locationFilter: ctx.input.locationFilter,
      sort: ctx.input.sort,
      sortDirection: ctx.input.sortDirection,
      offset: ctx.input.offset,
      number: ctx.input.maxResults
    });

    let articles = result.news.map(article => ({
      articleId: article.id,
      title: article.title,
      text: article.text,
      summary: article.summary,
      url: article.url,
      image: article.image,
      video: article.video,
      publishDate: article.publish_date,
      authors: article.authors,
      category: article.category,
      language: article.language,
      sourceCountry: article.source_country,
      sentiment: article.sentiment
    }));

    return {
      output: {
        offset: result.offset,
        totalAvailable: result.available,
        articles
      },
      message: `Found **${result.available}** matching articles. Returned **${articles.length}** articles (offset: ${result.offset}).`
    };
  })
  .build();
