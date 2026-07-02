import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let securitySchema = z.object({
  symbol: z.string().optional().describe('Ticker symbol'),
  exchange: z.string().optional().describe('Exchange')
});

export let newsWebhookTrigger = SlateTrigger.create(spec, {
  name: 'News Article Published',
  key: 'news_article_published',
  description:
    'Triggered when a new Benzinga news article is published. Webhook endpoint URL must be configured by Benzinga staff on your behalf. Delivers real-time article content including title, body, authors, associated securities, and channels.'
})
  .input(
    z.object({
      action: z.string().describe('Event action (e.g. Created, Updated, Removed)'),
      articleId: z.number().describe('Unique article identifier'),
      revisionId: z.number().optional().describe('Article revision ID'),
      title: z.string().optional().describe('Article headline'),
      body: z.string().optional().describe('Full article body'),
      teaser: z.string().optional().describe('Article summary'),
      url: z.string().optional().describe('Article URL'),
      contentType: z.string().optional().describe('Content type'),
      createdAt: z.string().optional().describe('Article creation timestamp'),
      updatedAt: z.string().optional().describe('Article update timestamp'),
      authors: z.array(z.string()).optional().describe('Article authors'),
      channels: z.array(z.string()).optional().describe('News channels/categories'),
      securities: z.array(securitySchema).optional().describe('Associated securities'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      articleId: z.number().describe('Unique article identifier'),
      revisionId: z.number().optional().describe('Article revision ID'),
      title: z.string().optional().describe('Article headline'),
      body: z.string().optional().describe('Full article body'),
      teaser: z.string().optional().describe('Article summary'),
      url: z.string().optional().describe('Article URL'),
      contentType: z.string().optional().describe('Content type'),
      createdAt: z.string().optional().describe('Article creation timestamp'),
      updatedAt: z.string().optional().describe('Article update timestamp'),
      authors: z.array(z.string()).optional().describe('Article authors'),
      channels: z.array(z.string()).optional().describe('News channels/categories'),
      tickers: z.array(z.string()).optional().describe('Associated ticker symbols'),
      securities: z
        .array(securitySchema)
        .optional()
        .describe('Associated securities with exchange info')
    })
  )
  .webhook({
    // Benzinga webhook URLs are configured by Benzinga staff, not via API
    // No autoRegisterWebhook or autoUnregisterWebhook

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Benzinga webhook v1 sends data in the format:
      // { api_version: "webhook/v1", kind: "News/v1", data: { id, action, timestamp, content } }
      // But may also send the content directly depending on configuration
      let eventData = data?.data || data;
      let content = eventData?.content || eventData;

      let action = eventData?.action || 'Created';
      let timestamp = eventData?.timestamp;

      let authors = (content?.authors || [])
        .map((a: any) => (typeof a === 'string' ? a : a?.name || ''))
        .filter(Boolean);

      let channels = (content?.channels || [])
        .map((c: any) => (typeof c === 'string' ? c : c?.name || ''))
        .filter(Boolean);

      let securities = (content?.securities || []).map((s: any) => ({
        symbol: s?.symbol,
        exchange: s?.exchange
      }));

      return {
        inputs: [
          {
            action,
            articleId: content?.id || eventData?.id,
            revisionId: content?.revision_id,
            title: content?.title,
            body: content?.body,
            teaser: content?.teaser,
            url: content?.url,
            contentType: content?.type,
            createdAt: content?.created_at,
            updatedAt: content?.updated_at,
            authors,
            channels,
            securities,
            timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let tickers = (ctx.input.securities || [])
        .map(s => s.symbol)
        .filter(Boolean) as string[];

      return {
        type: `article.${ctx.input.action.toLowerCase()}`,
        id: `${ctx.input.articleId}-${ctx.input.revisionId || 0}`,
        output: {
          articleId: ctx.input.articleId,
          revisionId: ctx.input.revisionId,
          title: ctx.input.title,
          body: ctx.input.body,
          teaser: ctx.input.teaser,
          url: ctx.input.url,
          contentType: ctx.input.contentType,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          authors: ctx.input.authors,
          channels: ctx.input.channels,
          tickers,
          securities: ctx.input.securities
        }
      };
    }
  })
  .build();
