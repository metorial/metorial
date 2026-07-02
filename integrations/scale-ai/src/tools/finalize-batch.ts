import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let finalizeBatch = SlateTool.create(spec, {
  name: 'Finalize Batch',
  key: 'finalize_batch',
  description: `Finalize a Scale AI batch so its tasks are sent to annotators. For Rapid/Studio projects, batches must be finalized before work begins. Optionally set the batch priority.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      batchName: z.string().describe('Name of the batch to finalize'),
      priority: z
        .number()
        .min(10)
        .max(30)
        .optional()
        .describe(
          'Priority for the batch (10=low, 20=normal, 30=high). Only affects tasks that have not yet started.'
        )
    })
  )
  .output(
    z
      .object({
        batchName: z.string().describe('Name of the finalized batch'),
        status: z.string().optional().describe('Updated batch status')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.finalizeBatch(ctx.input.batchName);

    if (ctx.input.priority !== undefined) {
      await client.prioritizeBatch(ctx.input.batchName, ctx.input.priority);
    }

    return {
      output: {
        batchName: result.name ?? ctx.input.batchName,
        status: result.status,
        ...result
      },
      message: `Finalized batch **${ctx.input.batchName}**${ctx.input.priority !== undefined ? ` with priority ${ctx.input.priority}` : ''}.`
    };
  })
  .build();
