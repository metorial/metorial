import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let triggerScrapingJob = SlateTool.create(spec, {
  name: 'Trigger Scraping Job',
  key: 'trigger_scraping_job',
  description: `Start an asynchronous data collection job using Bright Data's pre-built scrapers. Provide target URLs or keywords and receive a snapshot ID to track progress and download results later. Supports delivery via webhook or API download.`,
  instructions: [
    'Use list_scrapers to discover dataset IDs, supported collection methods, and required input fields.',
    'For URL-based scrapers, provide inputs as objects with a "url" key. For discovery scrapers, use "keyword" keys.',
    'Use the returned snapshotId with the "Get Scraping Job Status" and "Download Snapshot" tools to monitor and retrieve results.',
    'Optionally configure a webhook endpoint for automatic data delivery upon job completion.'
  ],
  constraints: [
    'Each batch can process up to 1GB of input.',
    'Rate limits apply — exceeding concurrent request limits returns a 429 error.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z
        .string()
        .describe(
          'ID of the pre-built scraper/dataset to use. Call list_scrapers to discover IDs.'
        ),
      inputs: z
        .array(z.record(z.string(), z.string()))
        .describe(
          'Array of input objects for the scraper. For URL scraping: [{"url": "https://example.com"}]. For discovery: [{"keyword": "search term"}].'
        ),
      format: z
        .enum(['json', 'ndjson', 'csv'])
        .optional()
        .describe('Output format for the collected data.'),
      limitPerInput: z
        .number()
        .optional()
        .describe('Maximum number of results per input (for discovery scrapers).'),
      notify: z
        .string()
        .optional()
        .describe('URL to receive a lightweight notification when the collection finishes.'),
      notifyOnCompletion: z
        .boolean()
        .optional()
        .describe(
          'Enable or disable completion notifications using the current API notification flag. Do not combine with notify.'
        ),
      endpoint: z
        .string()
        .optional()
        .describe('Webhook URL where the full scraped data will be delivered.'),
      authHeader: z
        .string()
        .optional()
        .describe('Authorization header value sent with webhook delivery.'),
      uncompressedWebhook: z
        .boolean()
        .optional()
        .describe('Send webhook data uncompressed (default is compressed).'),
      type: z.string().optional().describe('Set to "discover_new" to enable discovery phase.'),
      discoverBy: z
        .enum(['keyword', 'best_sellers_url', 'category_url', 'location', 'user_name'])
        .optional()
        .describe('Discovery method when using discovery mode.'),
      includeErrors: z.boolean().optional().describe('Include error reports in the output.')
    })
  )
  .output(
    z.object({
      snapshotId: z
        .string()
        .describe(
          'Unique identifier for the triggered collection job. Use this to track progress and download results.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let result = await client.triggerCollection({
      datasetId: ctx.input.datasetId,
      inputs: ctx.input.inputs,
      format: ctx.input.format,
      limitPerInput: ctx.input.limitPerInput,
      notify: ctx.input.notify,
      notifyOnCompletion: ctx.input.notifyOnCompletion,
      endpoint: ctx.input.endpoint,
      authHeader: ctx.input.authHeader,
      uncompressedWebhook: ctx.input.uncompressedWebhook,
      type: ctx.input.type,
      discoverBy: ctx.input.discoverBy,
      includeErrors: ctx.input.includeErrors
    });

    return {
      output: result,
      message: `Scraping job triggered successfully. Snapshot ID: **${result.snapshotId}**. Use this ID to check progress and download results.`
    };
  })
  .build();
