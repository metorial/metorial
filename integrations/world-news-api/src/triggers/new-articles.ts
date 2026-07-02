import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newArticlesTrigger = SlateTrigger.create(spec, {
  name: 'New Articles',
  key: 'new_articles',
  description:
    'Triggers when new news articles matching specified search criteria are published. Polls periodically for new articles and emits each new article as an event.'
})
  .input(
    z.object({
      articleId: z.number().describe('Unique ID of the news article'),
      title: z.string().describe('Article headline'),
      text: z.string().describe('Full text of the article'),
      summary: z.string().describe('Short summary'),
      url: z.string().describe('URL to the original article'),
      image: z.string().nullable().describe('Main image URL'),
      publishDate: z.string().describe('When the article was published'),
      authors: z.array(z.string()).describe('Article authors'),
      category: z.string().nullable().describe('Article category'),
      language: z.string().describe('Language code'),
      sourceCountry: z.string().describe('Source country code'),
      sentiment: z.number().nullable().describe('Sentiment score')
    })
  )
  .output(
    z.object({
      articleId: z.number().describe('Unique ID of the news article'),
      title: z.string().describe('Article headline'),
      text: z.string().describe('Full text of the article'),
      summary: z.string().describe('Short summary'),
      url: z.string().describe('URL to the original article'),
      image: z.string().nullable().describe('Main image URL'),
      publishDate: z.string().describe('When the article was published'),
      authors: z.array(z.string()).describe('Article authors'),
      category: z.string().nullable().describe('Article category'),
      language: z.string().describe('Language code'),
      sourceCountry: z.string().describe('Source country code'),
      sentiment: z.number().nullable().describe('Sentiment score')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPollDate = ctx.state?.lastPollDate as string | undefined;
      let now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      let searchParams: Record<string, any> = {
        language: 'en',
        sort: 'publish-time',
        sortDirection: 'DESC',
        number: 50
      };

      if (lastPollDate) {
        searchParams.earliestPublishDate = lastPollDate;
      }

      let result = await client.searchNews(searchParams);

      let inputs = (result.news || []).map(article => ({
        articleId: article.id,
        title: article.title,
        text: article.text,
        summary: article.summary,
        url: article.url,
        image: article.image,
        publishDate: article.publish_date,
        authors: article.authors || [],
        category: article.category,
        language: article.language,
        sourceCountry: article.source_country,
        sentiment: article.sentiment
      }));

      return {
        inputs,
        updatedState: {
          lastPollDate: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'article.published',
        id: String(ctx.input.articleId),
        output: {
          articleId: ctx.input.articleId,
          title: ctx.input.title,
          text: ctx.input.text,
          summary: ctx.input.summary,
          url: ctx.input.url,
          image: ctx.input.image,
          publishDate: ctx.input.publishDate,
          authors: ctx.input.authors,
          category: ctx.input.category,
          language: ctx.input.language,
          sourceCountry: ctx.input.sourceCountry,
          sentiment: ctx.input.sentiment
        }
      };
    }
  })
  .build();
