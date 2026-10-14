import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCrawlResults = SlateTool.create(spec, {
  name: 'Get Crawl Results',
  key: 'get_crawl_results',
  description: `Retrieve crawled URLs and optionally a page of extracted content from a completed or running crawl. The URL list contains up to the first 50 records for the requested status; content can be paginated or filtered to one URL.`,
  instructions: [
    'First retrieve URLs to see what was crawled, then optionally retrieve content for specific pages.',
    'Use **includeContent** to also retrieve page contents alongside URLs.',
    'The **contentFormat** parameter controls the format of retrieved content (e.g., "markdown" for LLM processing).',
    'Use **contentLimit** and **contentOffset** to retrieve further content pages. The content response includes pagination links.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      crawlUuid: z.string().describe('UUID of the crawl job.'),
      includeContent: z
        .boolean()
        .optional()
        .describe('Whether to also retrieve page contents (may be large).'),
      contentFormat: z
        .string()
        .optional()
        .describe('Content formats to retrieve, separated by commas (e.g., markdown,text).'),
      urlStatus: z
        .enum(['visited', 'failed', 'skipped'])
        .optional()
        .describe(
          'URL status to list. Defaults to visited. The API returns at most 50 records.'
        ),
      contentLimit: z
        .number()
        .min(1)
        .max(50)
        .refine(Number.isInteger, 'Must be a whole number.')
        .optional()
        .describe('Content URLs per page (1-50). Defaults to 10.'),
      contentOffset: z
        .number()
        .min(0)
        .refine(Number.isInteger, 'Must be a whole number.')
        .optional()
        .describe('Number of content URLs to skip for pagination.'),
      contentUrl: z
        .string()
        .optional()
        .describe('Retrieve content for this specific crawled URL.')
    })
  )
  .output(
    z.object({
      urls: z
        .any()
        .describe('Plain-text URL list. Failed and skipped records also include a reason.'),
      contents: z.any().optional().describe('Page contents if includeContent was set to true.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let urls = await client.getCrawlUrls(ctx.input.crawlUuid, ctx.input.urlStatus);

    let contents: any;
    if (ctx.input.includeContent) {
      contents = await client.getCrawlContents(ctx.input.crawlUuid, ctx.input.contentFormat, {
        limit: ctx.input.contentLimit,
        offset: ctx.input.contentOffset,
        url: ctx.input.contentUrl
      });
    }

    return {
      output: {
        urls,
        contents
      },
      message: `Retrieved crawl results for \`${ctx.input.crawlUuid}\`. ${ctx.input.includeContent ? 'URLs and content retrieved.' : 'URLs retrieved.'}`
    };
  })
  .build();
