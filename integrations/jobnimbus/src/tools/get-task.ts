import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ownerIds, recordId } from '../lib/records';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Retrieve a task by ID, including its completion state, schedule, related records, and assignees.',
  tags: { readOnly: true }
})
  .input(z.object({ taskId: z.string().describe('Task ID from list_tasks or create_task') }))
  .output(
    z.object({
      taskId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      recordTypeName: z.string().optional(),
      priority: z.number().optional(),
      isCompleted: z.boolean().optional(),
      parentRecordId: z.string().optional(),
      relatedRecordIds: z.array(z.string()),
      owners: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      dateStart: z.number().optional(),
      dateEnd: z.number().optional(),
      dateCreated: z.number().optional(),
      dateUpdated: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let task = await client.getTask(ctx.input.taskId);
    let relatedRecordIds = ownerIds(task.related) ?? [];
    return {
      output: {
        taskId: task.jnid,
        title: task.title ?? undefined,
        description: task.description ?? undefined,
        recordTypeName: task.record_type_name ?? undefined,
        priority: task.priority ?? undefined,
        isCompleted: task.is_completed ?? undefined,
        parentRecordId: recordId(task.primary) ?? relatedRecordIds[0],
        relatedRecordIds,
        owners: ownerIds(task.owners),
        tags: task.tags ?? undefined,
        dateStart: task.date_start ?? undefined,
        dateEnd: task.date_end ?? undefined,
        dateCreated: task.date_created ?? undefined,
        dateUpdated: task.date_updated ?? undefined
      },
      message: `Retrieved task ${task.title || task.jnid}.`
    };
  })
  .build();
