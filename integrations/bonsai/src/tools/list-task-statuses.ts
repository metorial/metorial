import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTaskStatuses = SlateTool.create(spec, {
  name: 'List Task Statuses',
  key: 'list_task_statuses',
  description:
    'List the task board columns in Bonsai with their IDs, names, completion states, and positions.',
  instructions: [
    'Use a column name as status in create_task. Columns can be customized for your account.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      statuses: z.array(
        z.object({
          id: z.string().describe('Task board column ID'),
          name: z.string(),
          state: z.string().describe('active or complete'),
          color: z.string().optional(),
          position: z.number().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let statuses = await new Client(ctx.auth).listTaskStatuses();
    return {
      output: { statuses, totalCount: statuses.length },
      message: `Found **${statuses.length}** task statuses.`
    };
  })
  .build();
