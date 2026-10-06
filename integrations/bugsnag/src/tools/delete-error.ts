import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

export const deleteError = SlateTool.create(spec, {
  key: 'delete_error',
  name: 'Delete Error',
  description:
    'Permanently delete one explicitly identified Bugsnag error and all its events. This cannot be undone; a future occurrence can create a new error group.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      projectId: z.string().describe('Project containing the error'),
      errorId: z.string().describe('Exact error group to permanently delete')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project containing the deleted error'),
      errorId: z.string().describe('Deleted error identifier'),
      deleted: z.boolean().describe('Whether the provider confirmed deletion')
    })
  )
  .handleInvocation(async ctx => {
    const projectId = ctx.input.projectId || ctx.config.projectId || '';
    await new BugsnagClient(ctx.auth).deleteError(projectId, ctx.input.errorId);
    return {
      output: { projectId, errorId: ctx.input.errorId, deleted: true },
      message: 'Deleted the error and its events.'
    };
  })
  .build();
