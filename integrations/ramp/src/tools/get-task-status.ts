import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid, object, recordSchema } from '../lib/validation';
import { spec } from '../spec';

export const getTaskStatus = SlateTool.create(spec, {
  key: 'get_task_status',
  name: 'Get Task Status',
  description:
    'Check a deferred user invitation task. STARTED and IN_PROGRESS mean it is still pending; ERROR is a failed task, and SUCCESS should be followed by a user readback. Requires users:write. Legacy card and limit task receipts are not supported by this endpoint.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      taskId: z.string().describe('User invitation task ID returned by manage_user.')
    })
  )
  .output(
    z.object({
      task: recordSchema.describe(
        'Task identifier, status and resource identifiers; upstream failure text is omitted.'
      ),
      completed: z.boolean(),
      failed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let raw = await clientFor(ctx).getDeferredTaskStatus(ctx.input.taskId);
    if (
      typeof raw.status !== 'string' ||
      !['STARTED', 'IN_PROGRESS', 'ERROR', 'SUCCESS'].includes(raw.status)
    )
      throw invalid('Ramp did not return a recognized user task status.');
    let data = raw.data === undefined ? {} : object(raw.data, 'task data');
    let task: Record<string, unknown> = { status: raw.status };
    if (typeof raw.id === 'string') task.id = raw.id;
    if (typeof data.user_id === 'string') task.data = { user_id: data.user_id };
    return {
      output: { task, completed: raw.status === 'SUCCESS', failed: raw.status === 'ERROR' },
      message:
        raw.status === 'ERROR'
          ? 'The user task failed. Check its inputs and account permissions.'
          : raw.status === 'SUCCESS'
            ? 'The user task completed. Read the user to confirm its state.'
            : 'The user task is still pending.'
    };
  })
  .build();
