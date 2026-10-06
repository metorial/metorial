import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { deleteAndConfirm } from '../lib/deletion';
import { invalidInput } from '../lib/errors';
import { taskSummary } from '../lib/jobs';
import { pageInput, perPageInput, resourceId, statusSchema, taskOutput } from '../lib/schemas';
import { spec } from '../spec';
export const manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description:
    'Get or list task states, explicitly cancel a waiting/processing task, create a new retry with a new ID, or delete a task and its data. Retry can consume credits and is never automatic. Cancellation and deletion do not refund consumed credits.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['get', 'list', 'cancel', 'retry', 'delete']),
      taskId: resourceId.optional().describe('Required except for list.'),
      jobId: resourceId.optional().describe('Optional exact job filter for list.'),
      status: statusSchema.optional().describe('Status filter for list.'),
      operation: z.string().min(1).optional().describe('Exact operation filter for list.'),
      page: pageInput,
      perPage: perPageInput
    })
  )
  .output(
    z.object({
      action: z.string(),
      taskId: z.string().optional(),
      task: taskOutput.optional(),
      tasks: z.array(taskOutput).optional(),
      deleted: z.boolean().optional(),
      currentPage: z.number().optional(),
      nextPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const input = ctx.input;
    if (input.action === 'list') {
      if (input.taskId !== undefined)
        throw invalidInput('taskId is not a list filter; use action get for one task.');
      const result = await client.listTasks(input);
      return {
        output: {
          action: input.action,
          tasks: result.data.map(taskSummary),
          currentPage: result.meta.current_page,
          nextPage: result.links.next === null ? undefined : result.meta.current_page + 1
        },
        message: `Found ${result.data.length} task(s) on page ${result.meta.current_page}.`
      };
    }
    if (!input.taskId)
      throw invalidInput('taskId is required for get, cancel, retry, and delete.');
    if (
      [input.jobId, input.status, input.operation].some(value => value !== undefined) ||
      input.page !== 1 ||
      input.perPage !== 25
    )
      throw invalidInput('List filters and pagination apply only to action list.');
    if (input.action === 'delete') {
      await deleteAndConfirm(client, 'task', input.taskId);
      return {
        output: { action: input.action, taskId: input.taskId, deleted: true },
        message: `Task ${input.taskId} is no longer readable after deletion. Consumed credits are not refunded by this action.`
      };
    }
    const task =
      input.action === 'cancel'
        ? await client.cancelTask(input.taskId)
        : input.action === 'retry'
          ? await client.retryTask(input.taskId)
          : await client.getTask(input.taskId);
    return {
      output: { action: input.action, taskId: task.id, task: taskSummary(task) },
      message:
        input.action === 'retry'
          ? `Created retry task ${task.id} from task ${input.taskId}; status is ${task.status}. This is a new task and can consume credits.`
          : input.action === 'cancel'
            ? `Cancellation requested for task ${task.id}; returned status is ${task.status}. Read this task again to confirm its final state.`
            : `Task ${task.id} is ${task.status}.`
    };
  })
  .build();
