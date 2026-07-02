import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let crawlCompleted = SlateTrigger.create(spec, {
  name: 'Crawl Completed',
  key: 'crawl_completed',
  description:
    'Triggers when a SmartCrawler crawl job has finished processing. Configure the webhook URL in the crawl request to receive notifications.'
})
  .input(
    z.object({
      status: z.string().describe('Status of the crawl job'),
      crawlId: z.string().describe('Unique identifier of the completed crawl job'),
      url: z.string().optional().describe('Starting URL of the crawl'),
      crawledUrls: z.array(z.string()).optional().describe('List of URLs that were crawled'),
      pages: z
        .array(
          z.object({
            url: z.string(),
            markdown: z.string().optional()
          })
        )
        .optional()
        .describe('Crawled pages with their content'),
      llmResult: z.unknown().optional().describe('AI extraction results'),
      rawPayload: z.record(z.string(), z.unknown()).optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      crawlId: z.string().describe('Unique identifier of the completed crawl job'),
      startUrl: z.string().optional().describe('Starting URL of the crawl'),
      status: z.string().describe('Final status of the crawl'),
      crawledUrls: z.array(z.string()).optional().describe('List of URLs that were crawled'),
      pageCount: z.number().describe('Number of pages crawled'),
      llmResult: z.unknown().optional().describe('AI extraction results if AI mode was used'),
      pages: z
        .array(
          z.object({
            url: z.string().describe('URL of the crawled page'),
            markdown: z.string().optional().describe('Markdown content of the page')
          })
        )
        .optional()
        .describe('Crawled pages with their content')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let crawlId = (data.request_id || data.crawl_id || data.id || '') as string;
      let status = (data.status || 'done') as string;
      let url = (data.url || data.website_url || '') as string;
      let crawledUrls = (data.crawled_urls || []) as string[];
      let pages = (data.pages || []) as Array<{ url: string; markdown?: string }>;
      let llmResult = data.llm_result;

      return {
        inputs: [
          {
            status,
            crawlId,
            url,
            crawledUrls,
            pages,
            llmResult,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let pageCount = (ctx.input.crawledUrls || []).length || (ctx.input.pages || []).length;

      return {
        type: 'crawl.completed',
        id: ctx.input.crawlId,
        output: {
          crawlId: ctx.input.crawlId,
          startUrl: ctx.input.url,
          status: ctx.input.status,
          crawledUrls: ctx.input.crawledUrls,
          pageCount,
          llmResult: ctx.input.llmResult,
          pages: ctx.input.pages
        }
      };
    }
  })
  .build();
