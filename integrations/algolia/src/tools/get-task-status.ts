import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let getTaskStatus = SlateTool.create(spec, {
  name: 'Get Task Status',
  key: 'get_task_status',
  description:
    'Check whether an asynchronous Algolia indexing task is published. Use taskID returned by record, index, settings, rule, or synonym operations before relying on their results.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      indexName: z.string().describe('Index on which the operation was performed.'),
      taskId: z.number().describe('taskID returned by the indexing operation.')
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      ...ctx.auth,
      analyticsRegion: ctx.config.analyticsRegion
    });
    let result = await client.getTask(ctx.input.indexName, ctx.input.taskId);
    return {
      output: result,
      message: `Task ${ctx.input.taskId} status: ${result.status}.`
    };
  })
  .build();
