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

export let getSourceNews = SlateTool.create(spec, {
  name: 'Get Source News',
  key: 'get_source_news',
  description: `Retrieve news articles from a specific news source. Use the "Get News Sources" tool first to discover available source identifiers. Supports pagination to browse through older articles from the same source.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      source: z
        .string()
        .describe(
          'Identifier of the news source (e.g., "bbc-news", "cnn"). Use "Get News Sources" to discover valid identifiers.'
        ),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      articles: z
        .array(newsArticleSchema)
        .describe('List of articles from the specified source'),
      page: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSourceNews({
      source: ctx.input.source,
      page: ctx.input.page
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

    return {
      output: {
        articles,
        page: result.page || 1
      },
      message: `Retrieved **${articles.length}** articles from source "${ctx.input.source}" on page ${result.page || 1}.`
    };
  })
  .build();
