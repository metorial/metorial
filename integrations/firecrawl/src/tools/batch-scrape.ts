import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { buildScrapeOptions, commonScrapeInputShape } from './shared';

let webhookSchema = z.object({
  url: z.string().describe('Webhook URL to notify'),
  headers: z.record(z.string(), z.string()).optional().describe('Headers for webhook calls'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Metadata included in webhook payloads'),
  events: z.array(z.string()).optional().describe('Webhook event names to receive')
});

export let batchScrapeTool = SlateTool.create(spec, {
  name: 'Batch Scrape',
  key: 'batch_scrape',
  description: `Start a Firecrawl v2 batch scrape job for a known list of URLs. Batch scrape supports the same extraction options as single-page scraping and returns an asynchronous job ID for polling, cancellation, and error retrieval.`,
  instructions: [
    'Provide the URLs to scrape.',
    'Use scrape option fields to control output formats and page handling.',
    'Use Get Batch Scrape Status to poll results or Cancel Batch Scrape to stop a running job.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      urls: z.array(z.string()).describe('List of URLs to scrape'),
      maxConcurrency: z.number().optional().describe('Maximum concurrent scrape operations'),
      ignoreInvalidURLs: z
        .boolean()
        .optional()
        .describe('Ignore invalid URLs instead of failing the entire batch'),
      webhook: webhookSchema.optional().describe('Webhook configuration for batch events'),
      ...commonScrapeInputShape
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Unique ID for the batch scrape job'),
      url: z.string().optional().describe('Status URL for the batch job'),
      invalidURLs: z
        .array(z.string())
        .optional()
        .describe('Invalid URLs ignored by Firecrawl'),
      success: z.boolean().optional().describe('Whether Firecrawl accepted the batch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.startBatchScrape({
      urls: ctx.input.urls,
      maxConcurrency: ctx.input.maxConcurrency,
      ignoreInvalidURLs: ctx.input.ignoreInvalidURLs,
      webhook: ctx.input.webhook,
      ...buildScrapeOptions(ctx.input)
    });

    return {
      output: {
        batchId: result.id,
        url: result.url,
        invalidURLs: result.invalidURLs,
        success: result.success
      },
      message: `Started batch scrape for **${ctx.input.urls.length}** URL(s) with ID \`${result.id}\`.`
    };
  });
