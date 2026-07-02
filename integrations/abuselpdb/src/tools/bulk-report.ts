import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let invalidReportSchema = z.object({
  input: z.string().describe('The raw CSV row that failed validation'),
  rowNumber: z.number().describe('Row number in the CSV file'),
  error: z.string().describe('Description of the validation error')
});

export let bulkReport = SlateTool.create(spec, {
  name: 'Bulk Report IPs',
  key: 'bulk_report',
  description: `Submit multiple IP abuse reports at once by uploading CSV data. The CSV should contain rows with IP address, categories, and optional comment/timestamp fields.

Returns the number of successfully saved reports and details about any invalid entries.`,
  instructions: [
    'CSV format: IP,Categories,Comment,Timestamp — where Categories is a comma-separated list of category IDs.',
    'The first row should be a header row: IP,Categories,Comment,Timestamp.',
    'Comments must not contain personally identifiable information (PII).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      csvContent: z
        .string()
        .describe(
          'CSV content with headers: IP,Categories,Comment,Timestamp. Each row represents one abuse report.'
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
