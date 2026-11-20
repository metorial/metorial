import { createApiServiceError, SlateTrigger } from 'slates';
import { GoogleTasksClient } from '../lib/client';
import { googleTasksActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  taskCompletedEventSchema,
  taskCompletedOutputSchema,
  taskCompletionId
} from './event-schemas';
import { taskCompletionEvents } from './task-completion-trigger-group';

export let taskCompleted = SlateTrigger.create(spec, {
  key: 'task_completed',
  name: 'Task Completed',
  description:
    'Observes non-assigned tasks completed since the previous check, checking every 15 minutes. Completions from the hour before activation can appear, and after an interruption checking resumes where it stopped. A completion reopened before it is observed is not reported.'
})
  .triggerGroup(taskCompletionEvents)
  .scopes(googleTasksActionScopes.taskCompleted)
  .input(taskCompletedEventSchema)
  .output(taskCompletedOutputSchema)
  .matches(payload => taskCompletedEventSchema.safeParse(payload).success)
  .map(async ctx => {
    let accountId = await new GoogleTasksClient(ctx.auth.token).getAccountId();
    if (accountId !== ctx.input.accountId) {
      throw createApiServiceError('The task completion belongs to another Google account.', {
        reason: 'google_tasks_account_mismatch'
      });
    }
    let { type, ...output } = ctx.input;
    return { type, id: taskCompletionId(output), output };
  })
  .build();
