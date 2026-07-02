import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBatch = SlateTool.create(spec, {
  name: 'Get Batch',
  key: 'get_batch',
  description: `Retrieve details and status for a specific Scale AI batch, including task completion progress.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      batchName: z.string().describe('Name of the batch to retrieve')
    })
  )
  .output(
    z
      .object({
        batchName: z.string().describe('Name of the batch'),
        projectName: z.string().optional().describe('Associated project name'),
        status: z
          .string()
          .optional()
          .describe('Batch status (staging, in_progress, completed)'),
        tasksPending: z.number().optional().describe('Number of pending tasks in the batch'),
        tasksCompleted: z
          .number()
          .optional()
          .describe('Number of completed tasks in the batch'),
        createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [batch, batchStatus] = await Promise.all([
      client.getBatch(ctx.input.batchName),
      client.getBatchStatus(ctx.input.batchName).catch(() => null)
    ]);

    return {
      output: {
        batchName: batch.name ?? ctx.input.batchName,
        projectName: batch.project,
        status: batchStatus?.status ?? batch.status,
        tasksPending: batchStatus?.tasks_pending,
        tasksCompleted: batchStatus?.tasks_completed,
        createdAt: batch.created_at,
        ...batch
      },
      message: `Batch **${ctx.input.batchName}** is \`${batchStatus?.status ?? batch.status}\`${batchStatus ? ` — ${batchStatus.tasks_completed ?? 0} completed, ${batchStatus.tasks_pending ?? 0} pending` : ''}.`
    };
  })
  .build();
