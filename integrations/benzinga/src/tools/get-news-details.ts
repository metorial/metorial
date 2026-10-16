import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient, recordsFrom } from '../lib/client';
import { spec } from '../spec';
import { newsArticleSchema, normalizeNewsArticle } from './search-news';

export let getNewsArticleTool = SlateTool.create(spec, {
  key: 'get_news_article',
  name: 'Get News Article',
  description:
    'Retrieve a Benzinga article by the articleId returned by search_news. Unknown articles or articles outside the API key entitlement return an empty list.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      articleId: z.number().describe('Article ID returned by search_news'),
      displayOutput: z
        .enum(['full', 'abstract', 'headline'])
        .optional()
        .default('full')
        .describe('Amount of article content to return')
    })
  )
  .output(
    z.object({
      articles: z.array(newsArticleSchema),
      count: z.number(),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let data = await new BenzingaClient({ token: ctx.auth.token }).getNewsArticle(
      ctx.input.articleId,
      ctx.input.displayOutput
    );
    let articles = recordsFrom(data).map(normalizeNewsArticle);
    return {
      output: { articles, count: articles.length, raw: data },
      message: `Retrieved ${articles.length} article(s).`
    };
  })
  .build();

export let getNewsChannelsTool = SlateTool.create(spec, {
  key: 'get_news_channels',
  name: 'Get News Channels',
  description:
    'Discover available Benzinga news channel names and identifiers for the channels filter in search_news. Includes subchannels as individual entries.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      channels: z
        .record(z.string(), z.unknown())
        .describe('Provider channel catalog, including its original names and identifiers')
    })
  )
  .handleInvocation(async ctx => {
    let channels = await new BenzingaClient({ token: ctx.auth.token }).getNewsChannels();
    if (!isApiErrorRecord(channels))
      throw createApiServiceError('Benzinga returned an unexpected news channel catalog.');
    return { output: { channels }, message: 'Retrieved available news channels.' };
  })
  .build();
