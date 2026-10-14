import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let invalidReportSchema = z.object({
  input: z.string().describe('The rejected input value returned by AbuseIPDB'),
  rowNumber: z.number().describe('Row number in the CSV file'),
  error: z.string().describe('Description of the validation error')
});

export let bulkReport = SlateTool.create(spec, {
  name: 'Bulk Report IPs',
  key: 'bulk_report',
  description: `Submit multiple IP abuse reports at once by uploading CSV data. Include the required IP, Categories, ReportDate, and Comment columns.

Returns the number of successfully saved reports and details about any invalid entries.`,
  instructions: [
    'CSV headers must include IP,Categories,ReportDate,Comment; column order may vary.',
    'Quote the Categories cell when it contains multiple comma-separated IDs, and quote comments containing commas or newlines.',
    'ReportDate should include a timezone and must be no older than two months. Every data field must contain a valid value.',
    'Comments must not contain personally identifiable information (PII).'
  ],
  constraints: ['CSV must be under 8 MB and contain at most 10,000 lines including headings.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      csvContent: z
        .string()
        .describe(
          'CSV content with required headers: IP,Categories,ReportDate,Comment. Each row represents one abuse report.'
        )
    })
  )
  .output(
    z.object({
      savedReports: z.number().describe('Number of reports successfully saved'),
      invalidReports: z
        .array(invalidReportSchema)
        .describe('List of invalid entries that were rejected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.bulkReport({
      csvContent: ctx.input.csvContent
    });

    let data = result.data;

    return {
      output: {
        savedReports: data.savedReports ?? 0,
        invalidReports: data.invalidReports ?? []
      },
      message: `Bulk report completed: **${data.savedReports ?? 0}** reports saved, **${(data.invalidReports ?? []).length}** invalid entries.`
    };
  })
  .build();
