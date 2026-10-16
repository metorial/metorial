import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { rawSchema, text } from '../lib/response';
import { spec } from '../spec';

export let getSystemStatus = SlateTool.create(spec, {
  key: 'get_system_status',
  name: 'Get System Status',
  description:
    'Check whether Browse AI’s task queue is operational or under maintenance before diagnosing delayed robot tasks.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      tasksQueueStatus: z
        .string()
        .describe('Provider task queue status, such as OK or UNDER_MAINTENANCE'),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getSystemStatus();
    return {
      output: {
        tasksQueueStatus: text(result.tasksQueueStatus, 'task queue status'),
        raw: result
      },
      message: `Browse AI task queue: **${result.tasksQueueStatus}**.`
    };
  })
  .build();
