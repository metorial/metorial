import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let taskCompleted = SlateTrigger.create(spec, {
  name: 'Task Completed',
  key: 'task_completed',
  description:
    "Triggered when Scale AI sends a task completion or error callback. Set this trigger's webhook URL as the callback_url when creating tasks or as your default callback URL in the Scale AI dashboard.",
  instructions: [
    'Use the generated webhook URL as the callback_url when creating tasks, or set it as your default callback URL in the Scale AI dashboard.',
    'Verify callbacks using the scale-callback-auth header against your Live Callback Auth Key.'
  ]
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the completed task'),
      status: z.string().describe('Task status (completed, error)'),
      taskType: z.string().optional().describe('Type of the task'),
      response: z.any().optional().describe('Task response/annotations'),
      rawPayload: z.any().describe('Full raw callback payload')
    })
  )
  .output(
    z
      .object({
        taskId: z.string().describe('ID of the completed task'),
        status: z.string().describe('Task status (completed, error)'),
        taskType: z.string().optional().describe('Type of the task'),
        response: z.any().optional().describe('Task response/annotations when completed'),
        projectName: z.string().optional().describe('Project the task belongs to'),
        batchName: z.string().optional().describe('Batch the task belongs to'),
        instruction: z.string().optional().describe('Task instructions'),
        metadata: z.record(z.string(), z.any()).optional().describe('Custom task metadata'),
        createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
        completedAt: z.string().optional().describe('ISO 8601 completion timestamp'),
        callbackSucceeded: z
          .boolean()
          .optional()
          .describe('Whether callback delivery succeeded')
      })
      .passthrough()
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let task = body.task ?? body;
      let taskId = body.task_id ?? task.task_id ?? '';
      let status = task.status ?? '';
      let taskType = task.type;

      return {
        inputs: [
          {
            taskId,
            status,
            taskType,
            response: body.response ?? task.response,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let task = ctx.input.rawPayload?.task ?? ctx.input.rawPayload ?? {};

      return {
        type: `task.${ctx.input.status}`,
        id: ctx.input.taskId,
        output: {
          taskId: ctx.input.taskId,
          status: ctx.input.status,
          taskType: ctx.input.taskType,
          response: ctx.input.response,
          projectName: task.project,
          batchName: task.batch,
          instruction: task.instruction,
          metadata: task.metadata,
          createdAt: task.created_at,
          completedAt: task.completed_at,
          callbackSucceeded: task.callback_succeeded,
          ...task
        }
      };
    }
  })
  .build();
