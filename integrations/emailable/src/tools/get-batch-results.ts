import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getBatchDownload } from '../lib/batch-download';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBatchResults = SlateTool.create(spec, {
  name: 'Get Batch Results',
  key: 'get_batch_results',
  description:
    'Download the completed results of an email verification batch. Small batches are provided as a JSON file with camelCase field names; large batches use the provider CSV download, documented as ZIP-compressed.',
  instructions: [
    'Call get_batch_status first to check that the batch has finished processing.'
  ],
  constraints: [
    'Small-batch individual results are retained for 30 days; large-batch download files are retained for 5 days.',
    'The file includes only the response fields selected when the batch was created.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      batchId: z.string().min(1).describe('Batch ID returned by verify_batch')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('The batch identifier'),
      format: z
        .enum(['json', 'provider_csv'])
        .describe('JSON results or the provider CSV download'),
      resultCount: z
        .number()
        .optional()
        .describe('Number of individual results when returned by the provider'),
      message: z.string().describe('Batch status message from Emailable')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getBatchStatus({
      batchId: ctx.input.batchId
    });
    if (result.downloadFile) {
      await ctx.addAttachment({ type: 'url', ...getBatchDownload(result) });
    } else if (result.emails) {
      await ctx.addAttachment({
        type: 'content',
        filename: 'emailable-batch-results.json',
        content: new Response(JSON.stringify(result.emails, null, 2), {
          headers: { 'content-type': 'application/json' }
        })
      });
    } else {
      throw createApiServiceError(
        `No individual results are available for batch ${result.batchId}. ${result.message} Check get_batch_status; results may still be processing or may have passed their retention period.`,
        { reason: 'emailable_batch_results_unavailable' }
      );
    }
    return {
      output: {
        batchId: result.batchId,
        format: result.downloadFile ? 'provider_csv' : 'json',
        resultCount: result.emails?.length,
        message: result.message
      },
      message: `The results for batch **${result.batchId}** are available as a downloadable file.`
    };
  })
  .build();
