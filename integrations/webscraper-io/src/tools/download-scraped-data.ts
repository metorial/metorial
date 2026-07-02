import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadScrapedData = SlateTool.create(spec, {
  name: 'Download Scraped Data',
  key: 'download_scraped_data',
  description: `Download the scraped data from a completed scraping job. Returns data as JSON records or raw CSV text based on the chosen format.`,
  instructions: [
    'The scraping job must be in "finished" status for data to be available.',
    'JSON format returns structured records. CSV format returns raw text.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scrapingJobId: z.number().describe('ID of the scraping job to download data from'),
      format: z
        .enum(['json', 'csv'])
        .default('json')
        .describe('Download format: "json" for structured records, "csv" for raw CSV text')
    })
  )
  .output(
    z.object({
      format: z.string().describe('The format of the returned data'),
      records: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Scraped data records (when format is json)'),
      csvContent: z.string().optional().describe('Raw CSV content (when format is csv)'),
      recordCount: z.number().describe('Number of records or lines returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.format === 'csv') {
      let csvContent = await client.downloadScrapedDataCsv(ctx.input.scrapingJobId);
      let lineCount = csvContent.split('\n').filter((l: string) => l.trim().length > 0).length;

      return {
        output: {
          format: 'csv',
          csvContent,
          recordCount: Math.max(0, lineCount - 1) // subtract header row
        },
        message: `Downloaded CSV data from job \`${ctx.input.scrapingJobId}\` — approximately ${Math.max(0, lineCount - 1)} records.`
      };
    }

    let records = await client.downloadScrapedDataJson(ctx.input.scrapingJobId);

    return {
      output: {
        format: 'json',
        records,
        recordCount: records.length
      },
      message: `Downloaded **${records.length}** JSON records from job \`${ctx.input.scrapingJobId}\`.`
    };
  })
  .build();
