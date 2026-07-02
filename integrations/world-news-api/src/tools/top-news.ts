import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let clusterArticleSchema = z.object({
  articleId: z.number().describe('Unique ID of the news article'),
  title: z.string().describe('Headline of the article'),
  text: z.string().describe('Full text content of the article'),
  summary: z.string().describe('Short summary of the article'),
  url: z.string().describe('URL to the original article'),
  image: z.string().nullable().describe('URL of the main article image'),
  publishDate: z.string().describe('ISO date when the article was published'),
  authors: z.array(z.string()).describe('List of article authors'),
  sentiment: z.number().nullable().describe('Sentiment score from -1 to +1')
});

let newsClusterSchema = z.object({
  articles: z
    .array(clusterArticleSchema)
    .describe('Articles in this topic cluster, ranked by coverage')
});

export let topNewsTool = SlateTool.create(spec, {
  name: 'Top News',
  key: 'top_news',
  description: `Retrieve the top/breaking news headlines for a specific country and language. News articles are clustered by topic — the more sources covering the same story, the higher it ranks. Useful for getting an overview of the day's most important stories.`,
  instructions: [
    'Both **sourceCountry** and **language** are required.',
    'Use **date** to get top news for a specific past date (format: YYYY-MM-DD). Defaults to today.',
    'Use **headlinesOnly** for faster responses with minimal data (just title, ID, URL).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceCountry: z.string().describe('ISO 3166 country code (e.g. "us", "gb", "de")'),
      language: z.string().describe('ISO 639-1 language code (e.g. "en", "de", "fr")'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
      headlinesOnly: z
        .boolean()
        .optional()
        .describe('Return only basic info (id, title, url) for faster response'),
      maxArticlesPerCluster: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Max articles per topic cluster (1–100)')
    })
  )
  .output(
    z.object({
      country: z.string().describe('Country code of the returned news'),
      language: z.string().describe('Language code of the returned news'),
      clusters: z.array(newsClusterSchema).describe('News topic clusters ranked by importance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTopNews({
      sourceCountry: ctx.input.sourceCountry,
      language: ctx.input.language,
      date: ctx.input.date,
      headlinesOnly: ctx.input.headlinesOnly,
      maxNewsPerCluster: ctx.input.maxArticlesPerCluster
    });

    let clusters = (result.top_news || []).map(cluster => ({
      articles: cluster.news.map(article => ({
        articleId: article.id,
        title: article.title,
        text: article.text,
        summary: article.summary,
        url: article.url,
        image: article.image,
        publishDate: article.publish_date,
        authors: article.authors,
        sentiment: article.sentiment
      }))
    }));

    return {
      output: {
        country: result.country,
        language: result.language,
        clusters
      },
      message: `Retrieved **${clusters.length}** top news clusters for **${result.country}** (${result.language}).`
    };
  })
  .build();
