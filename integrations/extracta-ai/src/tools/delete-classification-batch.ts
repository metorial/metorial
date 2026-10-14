import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteClassificationBatchTool = SlateTool.create(spec, {
  name: 'Delete Classification Batch',
  key: 'delete_classification_batch',
  description:
    'Permanently delete the selected batch and all its files, preserving the classification template.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      classificationId: z.string().describe('Classification identifier'),
      batchId: z
        .string()
        .describe('Batch ID from upload_classification_files or get_classification_results')
    })
  )
  .output(
    z.object({
      classificationId: z.string(),
      batchId: z.string(),
      status: z.string().describe('Deletion status'),
      providerMessage: z.string().optional().describe('Confirmation returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).deleteClassificationBatch(ctx.input);
    return {
      output: {
        classificationId: ctx.input.classificationId,
        batchId: ctx.input.batchId,
        status: result.status,
        providerMessage: result.message
      },
      message:
        'Deleted the selected batch and all its files from classification `' +
        ctx.input.classificationId +
        '`.'
    };
  })
  .build();
