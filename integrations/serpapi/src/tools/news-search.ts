import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptMessage, receiptOutput, SerpApiClient } from '../lib/client';
import { searchMetadataSchema, text } from '../lib/contracts';
import { searchParams } from '../lib/params';
import { spec } from '../spec';

let newsResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('News article title'),
  link: z.string().optional().describe('Article URL'),
  snippet: z.string().optional().describe('Article snippet/summary'),
  date: z.string().optional().describe('Publication date'),
  sourceName: z.string().optional().describe('News source name'),
  sourceIcon: z.string().optional().describe('News source icon URL'),
  thumbnailUrl: z.string().optional().describe('Article thumbnail URL')
});

export let newsSearchTool = SlateTool.create(spec, {
  name: 'News Search',
  key: 'news_search',
  description: `Search for news articles using Google News, Bing News, or DuckDuckGo News. Returns news headlines, snippets, publication dates, and source information. Supports filtering by topic, story, and publication tokens for Google News.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'News search query (required unless using topicToken, storyToken, or publicationToken)'
        ),
      engine: z
        .enum(['google_news', 'bing_news', 'duckduckgo_news'])
        .default('google_news')
        .describe('News search engine to use'),
      topicToken: z
        .string()
        .optional()
        .describe(
          'Google News topic token for browsing specific topics (mutually exclusive with query)'
        ),
      storyToken: z
        .string()
        .optional()
        .describe('Google News story token for a specific story'),
      publicationToken: z
        .string()
        .optional()
        .describe('Google News publication token for a specific publication'),
      language: z.string().optional().describe('Language code (e.g., "en")'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      async: z
        .boolean()
        .optional()
        .describe(
          'Submit asynchronously and return the native search ID/status. Not compatible with noCache or Ludicrous Speed accounts.'
        ),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      isComplete: z
        .boolean()
        .describe(
          'Whether native search status is Success; queued/processing receipts are incomplete.'
        ),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Native pagination metadata; follow native offsets/tokens without inferring a total.'
        ),
      searchMetadata: searchMetadataSchema.optional(),
      newsResults: z.array(newsResultSchema).describe('News article results'),
      menuLinks: z
        .array(
          z.object({
            title: z.string().optional().describe('Topic/menu link title'),
            topicToken: z.string().optional().describe('Token for navigating to this topic'),
            serpApiLink: z.string().optional().describe('SerpApi link for this topic')
          })
        )
        .optional()
        .describe('Navigation menu links/topics (Google News)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token, accountId: ctx.auth.accountId });

    let params = searchParams('news_search', ctx.input);

    let data = await client.search(params);

    const nativeNews = (data.news_results || data.organic_results || []).flatMap((r: any) =>
      r.stories ? r.stories : [r]
    );
    let newsResults = nativeNews.map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      date: r.date,
      sourceName: text(r.source?.name) ?? text(r.source),
      sourceIcon: r.source?.icon,
      thumbnailUrl: r.thumbnail
    }));

    let menuLinks = (data.menu_links || []).map((m: any) => ({
      title: m.title,
      topicToken: m.topic_token,
      serpApiLink: m.serpapi_link
    }));

    return {
      output: {
        ...receiptOutput(data),
        newsResults,
        menuLinks
      },
      message: receiptMessage(
        data,
        `News search returned **${newsResults.length}** articles${ctx.input.query ? ` for "${ctx.input.query}"` : ''} using ${ctx.input.engine}.`
      )
    };
  })
  .build();
