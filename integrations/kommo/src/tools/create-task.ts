import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

export let createTaskTool = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Kommo. Tasks can be linked to leads, contacts, or companies. Set the task description, deadline, type (follow-up or meeting), duration, and responsible user.`,
  instructions: [
    'The "text" and "completeTill" fields are required.',
    'Task type 1 = Follow-up, 2 = Meeting. Custom task types may have higher IDs.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      text: z.string().describe('Task description/text'),
      completeTill: z.number().describe('Deadline as Unix timestamp'),
      entityId: z.number().optional().describe('ID of the entity to link the task to'),
      entityType: z
        .enum(['leads', 'contacts', 'companies'])
        .optional()
        .describe('Type of entity to link'),
      taskTypeId: z.number().optional().describe('Task type ID (1=Follow-up, 2=Meeting)'),
      duration: z.number().optional().describe('Task duration in seconds'),
      responsibleUserId: z.number().optional().describe('ID of the responsible user')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the created task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let payload: Record<string, any> = {
      text: ctx.input.text,
      complete_till: ctx.input.completeTill
    };

    if (ctx.input.entityId) payload.entity_id = ctx.input.entityId;
    if (ctx.input.entityType) payload.entity_type = ctx.input.entityType;
    if (ctx.input.taskTypeId) payload.task_type_id = ctx.input.taskTypeId;
    if (ctx.input.duration) payload.duration = ctx.input.duration;
    if (ctx.input.responsibleUserId) payload.responsible_user_id = ctx.input.responsibleUserId;

    let result = await client.createTask(payload);

    return {
      output: { taskId: result.id },
      message: `Created task **"${ctx.input.text}"** with ID **${result.id}**.`
    };
  })
  .build();
