import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { validateWebsiteUrl } from '../lib/privacy';
import { spec } from '../spec';

export let websiteToRssTool = SlateTool.create(spec, {
  name: 'Website to RSS Feed',
  key: 'website_to_rss',
  description: 'Prepare a downloadable RSS feed for a news website or section page.',
  instructions: [
    'Downloading the feed requests current news from the provider and consumes API quota. Repeated downloads can issue another request.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z.string().max(1000).describe('News website or section URL'),
      extractNews: z
        .boolean()
        .optional()
        .describe('Include extracted articles instead of links only')
    })
  )
  .output(
    z.object({
      sourceUrl: z.string().describe('Website used for the feed'),
      format: z.literal('rss').describe('Download format'),
      status: z.literal('prepared').describe('The feed download has been prepared')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.token.trim()) {
      throw createApiServiceError('Provide your World News API key.');
    }
    validateWebsiteUrl(ctx.input.url, ctx.auth.token);
    await ctx.addAttachment({
      type: 'url',
      url: 'https://api.worldnewsapi.com/feed.rss',
      headers: { 'x-api-key': ctx.auth.token },
      query: {
        url: ctx.input.url,
        ...(ctx.input.extractNews !== undefined
          ? { 'extract-news': String(ctx.input.extractNews) }
          : {})
      },
      mimeType: 'application/rss+xml'
    });
    return {
      output: { sourceUrl: ctx.input.url, format: 'rss', status: 'prepared' },
      message:
        'Prepared an RSS feed download. The provider generates the feed when it is downloaded.'
    };
  })
  .build();
