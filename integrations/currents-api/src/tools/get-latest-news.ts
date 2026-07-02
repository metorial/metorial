import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let newsArticleSchema = z.object({
  articleId: z.string().describe('Unique identifier of the article'),
  title: z.string().describe('Headline of the article'),
  description: z.string().describe('Brief summary or body of the article'),
  url: z.string().describe('URL to the full article'),
  imageUrl: z.string().describe('URL of the article image'),
  publishedAt: z.string().describe('Publication date and time in ISO 8601 format'),
  language: z.string().describe('Language code of the article'),
  categories: z.array(z.string()).describe('Categories the article belongs to'),
  author: z.string().describe('Author of the article'),
  countries: z.array(z.string()).describe('Country codes associated with the article')
});

export let getLatestNews = SlateTool.create(spec, {
  name: 'Get Latest News',
  key: 'get_latest_news',
  description: `Fetch the most recent news articles from global sources. Returns a real-time stream of international news that can be filtered by language, category, country, and keywords. Useful for staying updated on current events, monitoring specific topics, or building news feeds.`,
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
        .describe(
          'Language code to filter articles (e.g., "en", "es", "fr"). Defaults to English if not specified.'
        ),
      category: z
        .string()
        .optional()
        .describe(
          'News category to filter by (e.g., "technology", "business", "sports", "politics", "health", "science", "entertainment", "world", "finance", "programming", "academia", "lifestyle", "opinion", "food", "game", "general", "regional")'
        ),
      country: z
        .string()
        .optional()
        .describe('Country code to filter articles by region (e.g., "US", "GB", "DE")'),
      keywords: z
        .string()
        .optional()
        .describe('Keywords to filter articles by in titles or descriptions')
    })
  )
  .output(
    z.object({
      articles: z.array(newsArticleSchema).describe('List of latest news articles'),
      page: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLatestNews({
      language: ctx.input.language,
      category: ctx.input.category,
      country: ctx.input.country,
      keywords: ctx.input.keywords
    });

    let articles = (result.news || []).map(article => ({
      articleId: article.id || '',
      title: article.title || '',
      description: article.description || '',
      url: article.url || '',
      imageUrl: article.image || '',
      publishedAt: article.published || '',
      language: article.language || '',
      categories: article.category || [],
      author: article.author || '',
      countries: article.country || []
    }));

    let filterParts: string[] = [];
    if (ctx.input.language) filterParts.push(`language: ${ctx.input.language}`);
    if (ctx.input.category) filterParts.push(`category: ${ctx.input.category}`);
    if (ctx.input.country) filterParts.push(`country: ${ctx.input.country}`);
    if (ctx.input.keywords) filterParts.push(`keywords: "${ctx.input.keywords}"`);

    let filterDesc = filterParts.length > 0 ? ` (filtered by ${filterParts.join(', ')})` : '';

    return {
      output: {
        articles,
        page: result.page || 1
      },
      message: `Retrieved **${articles.length}** latest news articles${filterDesc}.`
    };
  })
  .build();
