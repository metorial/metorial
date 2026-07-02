import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let thresholdSchema = z.object({
  got: z.number().describe('Actual value'),
  expected: z.number().describe('Expected threshold value'),
  success: z.boolean().describe('Whether the threshold was met')
});

export let getDataQuality = SlateTool.create(spec, {
  name: 'Get Data Quality',
  key: 'get_data_quality',
  description: `Retrieve the data quality report for a scraping job. Reports whether the scraped data meets configurable thresholds for record count, failed/empty page rates, and column fill rates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scrapingJobId: z.number().describe('ID of the scraping job to check data quality for')
    })
  )
  .output(
    z.object({
      overallSuccess: z.boolean().describe('Whether all data quality checks passed'),
      minRecordCount: thresholdSchema.describe('Minimum record count check'),
      maxFailedPagesPercent: thresholdSchema.describe('Maximum failed pages percentage check'),
      maxEmptyPagesPercent: thresholdSchema.describe('Maximum empty pages percentage check'),
      maxNoValuePagesPercent: thresholdSchema.describe(
        'Maximum no-value pages percentage check'
      ),
      minColumnRecords: z
        .record(z.string(), thresholdSchema)
        .optional()
        .describe('Per-column fill rate checks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let quality = await client.getDataQuality(ctx.input.scrapingJobId);

    return {
      output: {
        overallSuccess: quality.overall_data_quality_success,
        minRecordCount: quality.min_record_count,
        maxFailedPagesPercent: quality.max_failed_pages_percent,
        maxEmptyPagesPercent: quality.max_empty_pages_percent,
        maxNoValuePagesPercent: quality.max_no_value_pages_percent,
        minColumnRecords: quality.min_column_records
      },
      message: `Data quality for job \`${ctx.input.scrapingJobId}\`: **${quality.overall_data_quality_success ? 'PASSED' : 'FAILED'}**.`
    };
  })
  .build();
