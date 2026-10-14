import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { businessIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createBulkJob = SlateTool.create(spec, {
  name: 'Create Bulk Job',
  key: 'create_bulk_job',
  description: `Create a bulk sending job to send multiple documents based on a template. Provide document data as a 2D array (headers + rows) matching the template's CSV structure. Use the "Get Bulk CSV Template" tool to retrieve the expected CSV format. Call list_businesses to discover the businessId.`,
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
      businessId: businessIdSchema,
      templateHash: z.string().describe('Hash ID of the template to use for bulk sending'),
      csvData: z
        .array(z.array(z.string()))
        .min(2)
        .max(251)
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
    let client = createClient(ctx.config, ctx.auth, ctx.input.businessId);
    let width = ctx.input.csvData[0]?.length;
    if (!width || ctx.input.csvData.some(row => row.length !== width)) {
      throw createApiServiceError(
        'CSV rows must have the same number of columns as the non-empty header row.'
      );
    }
    let result = await client.createBulkJob(ctx.input.templateHash, ctx.input.csvData);
    if (result.entry_id === undefined || result.entry_id === null) {
      throw createApiServiceError('Eversign did not return a bulk job ID.');
    }

    return {
      output: {
        bulkJobId: String(result.entry_id),
        templateHash: result.template_hash || ctx.input.templateHash,
        documentCount: result.document_count ?? 0,
        status: result.status
      },
      message: `Bulk job created with ${result.document_count || 0} document(s) based on template "${ctx.input.templateHash}".`
    };
  })
  .build();
