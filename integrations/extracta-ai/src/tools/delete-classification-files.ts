import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteClassificationFilesTool = SlateTool.create(spec, {
  name: 'Delete Classification Files',
  key: 'delete_classification_files',
  description:
    'Permanently delete the selected files from a batch, preserving the classification template.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      classificationId: z.string().describe('Classification identifier'),
      batchId: z
        .string()
        .describe('Batch ID from upload_classification_files or get_classification_results'),
      fileIds: z
        .array(z.string())
        .describe('File IDs from get_classification_results to delete from this batch')
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
    let result = await new Client(ctx.auth.token).deleteClassificationFiles(ctx.input);
    return {
      output: {
        classificationId: ctx.input.classificationId,
        batchId: ctx.input.batchId,
        status: result.status,
        providerMessage: result.message
      },
      message:
        'Deleted the selected files from a batch from classification `' +
        ctx.input.classificationId +
        '`.'
    };
  })
  .build();
