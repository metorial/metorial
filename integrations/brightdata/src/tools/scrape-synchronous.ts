import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let scrapeSynchronous = SlateTool.create(spec, {
  name: 'Scrape Synchronous',
  key: 'scrape_synchronous',
  description: `Scrape data from websites using Bright Data's pre-built scrapers and receive results in real-time. Best for small requests (up to 20 URLs). If the request takes longer than 1 minute, a snapshot ID is returned instead for async retrieval.`,
  instructions: [
    'Use this tool for quick, small-scale scraping tasks with immediate results.',
    'For larger jobs (many URLs or discovery tasks), use "Trigger Scraping Job" instead.',
    'If the response indicates the job is still in progress, use the returned snapshotId with "Get Scraping Job Status" and "Download Snapshot" to retrieve results.'
  ],
  constraints: [
    'Limited to around 20 URL inputs for real-time processing.',
    'Requests exceeding 1 minute timeout return a snapshot ID for async retrieval.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the pre-built scraper/dataset to use.'),
      inputs: z
        .array(z.record(z.string(), z.string()))
        .describe(
          'Array of input objects. For URL scraping: [{"url": "https://example.com"}].'
        ),
      format: z
        .enum(['json', 'ndjson', 'csv'])
        .optional()
        .describe('Output format for the scraped data.'),
      includeErrors: z.boolean().optional().describe('Include error reports in the output.')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of scraped data records. Empty if the job is still in progress.'),
      snapshotId: z
        .string()
        .optional()
        .describe('Snapshot ID for async retrieval if the job exceeded the sync timeout.'),
      inProgress: z
        .boolean()
        .describe('Whether the job is still running and results are not yet available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let result = await client.scrapeSync({
      datasetId: ctx.input.datasetId,
      inputs: ctx.input.inputs,
      format: ctx.input.format,
      includeErrors: ctx.input.includeErrors
    });

    if (result.inProgress) {
      return {
        output: result,
        message: `Scraping job is still processing. Snapshot ID: **${result.snapshotId}**. Use "Get Scraping Job Status" to track progress and "Download Snapshot" to retrieve results once ready.`
      };
    }

    return {
      output: result,
      message: `Scraped **${result.records.length}** record(s) successfully.`
    };
  })
  .build();
