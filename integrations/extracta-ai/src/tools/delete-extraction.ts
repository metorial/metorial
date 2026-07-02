import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteExtractionTool = SlateTool.create(spec, {
  name: 'Delete Extraction',
  key: 'delete_extraction',
  description: `Delete an extraction template, a specific batch within it, or an individual file. Providing only the extraction ID deletes the entire extraction. Adding a batch ID deletes that batch. Adding both batch and file IDs deletes a single file.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      extractionId: z.string().describe('Unique identifier of the extraction'),
      batchId: z
        .string()
        .optional()
        .describe('Batch ID to delete a specific batch (instead of the whole extraction)'),
      fileId: z
        .string()
        .optional()
        .describe('File ID to delete a specific file within a batch')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status'),
      deletedAt: z.number().describe('Timestamp of deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.deleteExtraction({
      extractionId: ctx.input.extractionId,
      batchId: ctx.input.batchId,
      fileId: ctx.input.fileId
    });

    let target = ctx.input.fileId
      ? `file \`${ctx.input.fileId}\``
      : ctx.input.batchId
        ? `batch \`${ctx.input.batchId}\``
        : `extraction \`${ctx.input.extractionId}\``;

    return {
      output: {
        status: result.status,
        deletedAt: result.deletedAt
      },
      message: `Deleted ${target}.`
    };
  })
  .build();
