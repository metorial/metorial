import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

export let retryFileProcessing = SlateTool.create(spec, {
  name: 'Retry File Processing',
  key: 'retry_file_processing',
  description: `Retry predictions or exports for previously processed files. Use this when files failed to process correctly or when exports need to be re-triggered.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the model the files belong to'),
      fileIds: z.array(z.string()).min(1).describe('IDs of files to retry'),
      retryType: z
        .enum(['prediction', 'export'])
        .describe('Whether to retry the prediction/extraction or the export')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the retry was successfully initiated'),
      retriedCount: z.number().describe('Number of files queued for retry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    if (ctx.input.retryType === 'export') {
      await client.retryExports(ctx.input.modelId, ctx.input.fileIds);
    } else {
      await client.retryPrediction(ctx.input.modelId, ctx.input.fileIds);
    }

    return {
      output: {
        success: true,
        retriedCount: ctx.input.fileIds.length
      },
      message: `Retried **${ctx.input.retryType}** for **${ctx.input.fileIds.length}** file(s) on model \`${ctx.input.modelId}\`.`
    };
  })
  .build();
