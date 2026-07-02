import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTaskTypes = SlateTool.create(spec, {
  name: 'List Task Types',
  key: 'list_task_types',
  description:
    'Lists configured deal task types. Use this to find taskTypeId values before creating tasks.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      taskTypes: z.array(
        z.object({
          taskTypeId: z.string(),
          title: z.string().optional(),
          description: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let result = await client.listTaskTypes();
    let taskTypes = (result.dealTasktypes || []).map((taskType: any) => ({
      taskTypeId: taskType.id,
      title: taskType.title || undefined,
      description: taskType.description || undefined
    }));

    return {
      output: { taskTypes },
      message: `Found **${taskTypes.length}** task types.`
    };
  })
  .build();
