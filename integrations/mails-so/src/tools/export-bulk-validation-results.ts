import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapEmailValidationResult } from '../lib/results';
import { spec } from '../spec';

export let exportBulkValidationResults = SlateTool.create(spec, {
  name: 'Export Bulk Validation Results',
  key: 'export_bulk_validation_results',
  description:
    'Download a completed bulk email validation job as a JSON file containing every email result, validation ID, score, reason, and check. Useful for archiving a validated list or importing it into another system.',
  instructions: [
    'Use the batch ID returned by Bulk Validate Emails.',
    'Call Get Bulk Validation Results to check progress. Export is available after processing finishes.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      batchId: z.string().describe('Batch ID returned by Bulk Validate Emails')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Unique identifier for the exported batch job'),
      finishedAt: z.string().describe('Timestamp when the batch finished'),
      size: z.number().describe('Number of emails submitted in the batch'),
      resultCount: z.number().describe('Number of email results in the downloaded file'),
      filename: z.string().describe('Name of the downloadable JSON file'),
      mimeType: z.string().describe('File content type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let batch = await client.getBatchStatus(ctx.input.batchId);
    if (!batch.finished_at) {
      throw createApiServiceError(
        'The batch is still processing. Check Get Bulk Validation Results and export again after it finishes.'
      );
    }
    let results = (batch.emails ?? []).map(mapEmailValidationResult);
    let filename = 'bulk-validation-results.json';
    let mimeType = 'application/json';
    await ctx.addAttachment({
      type: 'content',
      filename,
      mimeType,
      content: new Response(
        JSON.stringify(
          {
            batchId: batch.id,
            createdAt: batch.created_at,
            finishedAt: batch.finished_at,
            size: batch.size,
            results
          },
          null,
          2
        ),
        { headers: { 'content-type': mimeType } }
      )
    });
    return {
      output: {
        batchId: batch.id,
        finishedAt: batch.finished_at,
        size: batch.size,
        resultCount: results.length,
        filename,
        mimeType
      },
      message: `Prepared **${filename}** with **${results.length}** validation results from batch **${batch.id}**.`
    };
  })
  .build();
