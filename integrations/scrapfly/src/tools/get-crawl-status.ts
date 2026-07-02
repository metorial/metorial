import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCrawlStatus = SlateTool.create(spec, {
  name: 'Get Crawl Status',
  key: 'get_crawl_status',
  description: `Retrieve the current status and progress of a running or completed crawl job. Returns page counts, credit usage, duration, and completion state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      crawlUuid: z.string().describe('UUID of the crawl job to check.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Crawl status: PENDING, RUNNING, DONE, or CANCELLED.'),
      isFinished: z.boolean().describe('Whether the crawl has completed.'),
      isSuccess: z.boolean().optional().describe('Whether the crawl completed successfully.'),
      urlsVisited: z.number().optional().describe('Number of URLs visited so far.'),
      urlsExtracted: z.number().optional().describe('Number of URLs discovered.'),
      urlsFailed: z.number().optional().describe('Number of URLs that failed.'),
      urlsSkipped: z.number().optional().describe('Number of URLs skipped.'),
      urlsToCrawl: z.number().optional().describe('Number of URLs remaining to crawl.'),
      apiCreditUsed: z.number().optional().describe('Total API credits consumed.'),
      duration: z.number().optional().describe('Crawl duration in seconds.'),
      stopReason: z
        .string()
        .optional()
        .describe('Reason the crawl stopped (e.g., no_more_urls, page_limit, max_duration).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getCrawlStatus(ctx.input.crawlUuid);
    let state = result?.state ?? {};

    return {
      output: {
        status: result.status,
        isFinished: result.is_finished ?? false,
        isSuccess: result.is_success,
        urlsVisited: state.urls_visited,
        urlsExtracted: state.urls_extracted,
        urlsFailed: state.urls_failed,
        urlsSkipped: state.urls_skipped,
        urlsToCrawl: state.urls_to_crawl,
        apiCreditUsed: state.api_credit_used,
        duration: state.duration,
        stopReason: result.stop_reason
      },
      message: `Crawl \`${ctx.input.crawlUuid}\` - Status: **${result.status}**. Visited: ${state.urls_visited ?? 0} pages. ${result.is_finished ? `Finished. Stop reason: ${result.stop_reason ?? 'completed'}.` : `Remaining: ${state.urls_to_crawl ?? 'unknown'} pages.`}`
    };
  })
  .build();
