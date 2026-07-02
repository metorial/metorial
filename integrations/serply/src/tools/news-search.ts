import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let newsEntrySchema = z.object({
  title: z.string().optional().describe('Article headline'),
  link: z.string().optional().describe('URL to the article'),
  summary: z.string().optional().describe('Article summary or excerpt'),
  published: z.string().optional().describe('Publication date'),
  source: z.string().optional().describe('News source name')
});

export let newsSearch = SlateTool.create(spec, {
  name: 'News Search',
  key: 'news_search',
  description: `Search Google News for current news articles and retrieve structured results. Returns article headlines, links, summaries, publication dates, and source information. Useful for monitoring news coverage, building news aggregators, or tracking topics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'News search query. Can include filters like ceid=US:en for country/language targeting.'
        ),
      num: z.number().optional().describe('Number of results to return'),
      start: z.number().optional().describe('Start offset for pagination'),
      language: z
        .string()
        .optional()
        .describe('Search language filter (e.g., lang_en, lang_es)'),
      interfaceLanguage: z
        .string()
        .optional()
        .describe('Interface language code (e.g., en, es)'),
      proxyLocation: z
        .enum([
          'US',
          'EU',
          'CA',
          'GB',
          'FR',
          'DE',
          'SE',
          'IE',
          'IN',
          'JP',
          'KR',
          'SG',
          'AU',
          'BR'
        ])
        .optional()
        .describe('Geographic location for geo-targeted results, overrides default'),
      deviceType: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Device type for results, overrides default')
    })
  )
  .output(
    z.object({
      entries: z.array(newsEntrySchema).describe('News article entries'),
      feedTitle: z.string().optional().describe('Title of the news feed'),
      feedLanguage: z.string().optional().describe('Language of the news feed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      proxyLocation: ctx.config.proxyLocation,
      deviceType: ctx.config.deviceType
    });

    let data = await client.newsSearch({
      query: ctx.input.query,
      num: ctx.input.num,
      start: ctx.input.start,
      lr: ctx.input.language,
      hl: ctx.input.interfaceLanguage,
      proxyLocation: ctx.input.proxyLocation,
      deviceType: ctx.input.deviceType
    });

    let feed = data.feed || {};
    let entries = feed.entries || data.entries || [];

    return {
      output: {
        entries,
        feedTitle: feed.title || null,
        feedLanguage: feed.language || null
      },
      message: `Found **${entries.length}** news articles for "${ctx.input.query}".`
    };
  })
  .build();
