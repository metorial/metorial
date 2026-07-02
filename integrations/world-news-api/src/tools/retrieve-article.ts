import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let articleDetailSchema = z.object({
  articleId: z.number().describe('Unique ID of the news article'),
  title: z.string().describe('Headline of the article'),
  text: z.string().describe('Full text content of the article'),
  summary: z.string().describe('Short summary of the article'),
  url: z.string().describe('URL to the original article'),
  image: z.string().nullable().describe('URL of the main article image'),
  video: z.string().nullable().describe('URL of the associated video'),
  publishDate: z.string().describe('ISO date when the article was published'),
  authors: z.array(z.string()).describe('List of article authors'),
  category: z.string().nullable().describe('Article category'),
  language: z.string().describe('ISO 639-1 language code'),
  sourceCountry: z.string().describe('ISO 3166 country code of the news source'),
  sentiment: z.number().nullable().describe('Sentiment score from -1 to +1')
});

export let retrieveArticleTool = SlateTool.create(spec, {
  name: 'Retrieve Articles',
  key: 'retrieve_articles',
  description: `Fetch the full details of one or more news articles by their IDs. Article IDs are obtained from other tools like Search News or Top News. Returns complete article data including title, text, summary, images, videos, authors, publish date, sentiment, and category.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      articleIds: z.array(z.number()).min(1).describe('List of article IDs to retrieve')
    })
  )
  .output(
    z.object({
      articles: z.array(articleDetailSchema).describe('Retrieved article details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.retrieveNews(ctx.input.articleIds);

    let articles = (result.news || []).map(article => ({
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
        articles
      },
      message: `Retrieved **${articles.length}** article(s).`
    };
  })
  .build();
