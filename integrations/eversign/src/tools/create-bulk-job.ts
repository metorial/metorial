import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createBulkJob = SlateTool.create(spec, {
  name: 'Create Bulk Job',
  key: 'create_bulk_job',
  description: `Create a bulk sending job to send multiple documents based on a template. Provide document data as a 2D array (headers + rows) matching the template's CSV structure. Use the "Get Bulk CSV Template" tool to retrieve the expected CSV format.`,
  instructions: [
    'Maximum of 250 documents per bulk job.',
    'CSV data must be provided as a 2D array where the first element is the header row.',
    'Use the get_bulk_csv_template tool first to understand the required CSV structure for a template.'
  ],
  constraints: ['Hard limit of 250 documents per single bulk job.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateHash: z.string().describe('Hash ID of the template to use for bulk sending'),
      csvData: z
        .array(z.array(z.string()))
        .describe(
          '2D array of CSV data (first row is headers, subsequent rows are document data)'
        )
    })
  )
  .output(
    z.object({
      bulkJobId: z.string().describe('Unique identifier of the created bulk job'),
      templateHash: z.string().describe('Template hash used'),
      documentCount: z.number().describe('Number of documents to be created'),
      status: z.string().describe('Job creation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.createBulkJob(ctx.input.templateHash, ctx.input.csvData);

    return {
      output: {
        bulkJobId: String(result.entry_id || result.id || ''),
        templateHash: result.template_hash || ctx.input.templateHash,
        documentCount: result.document_count || 0,
        status: result.status || 'created'
      },
      message: `Bulk job created with ${result.document_count || 0} document(s) based on template "${ctx.input.templateHash}".`
    };
  })
  .build();
