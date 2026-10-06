import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { projectIdSchema } from '../lib/validation';
import { spec } from '../spec';

export let manageError = SlateTool.create(spec, {
  name: 'Manage Error',
  key: 'manage_error',
  description: `Resolve, unresolve, ignore, assign, pause, or delete an error (fault) in Honeybadger. Also supports bulk resolving errors that match a search query and adding comments to errors.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      action: z
        .enum([
          'resolve',
          'unresolve',
          'ignore',
          'unignore',
          'assign',
          'pause',
          'unpause',
          'delete',
          'bulk_resolve',
          'comment',
          'delete_comment'
        ])
        .describe('Action to perform'),
      faultId: z
        .string()
        .optional()
        .describe('Fault ID (required for all actions except bulk_resolve)'),
      assigneeId: z
        .number()
        .optional()
        .describe('User ID to assign the error to (for assign action)'),
      pauseTime: z
        .enum(['hour', 'day', 'week'])
        .optional()
        .describe('Duration to pause notifications (for pause action)'),
      pauseCount: z
        .number()
        .optional()
        .describe(
          'Occurrence count to pause until (for pause action, alternative to pauseTime)'
        ),
      query: z.string().optional().describe('Search query for bulk_resolve action'),
      commentId: z.string().optional().describe('Comment ID for delete_comment'),
      commentBody: z.string().optional().describe('Comment text (for comment action)')
    })
  )
  .output(
    z.object({
      queued: z
        .boolean()
        .optional()
        .describe('Whether bulk resolution was queued for background processing'),
      success: z.boolean().describe('Whether the operation succeeded'),
      commentId: z
        .number()
        .optional()
        .describe('ID of the created comment (for comment action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient(ctx.auth);
    let { projectId, action, faultId, assigneeId, pauseTime, pauseCount, query, commentBody } =
      ctx.input;

    if (action === 'bulk_resolve') {
      const result = await client.bulkResolveFaults(projectId, query);
      return {
        output: { success: true, queued: result.queued },
        message: `${result.queued ? 'Queued bulk resolution of' : 'Resolved'} errors${query ? ` matching "${query}"` : ''} in project ${projectId}.`
      };
    }

    if (!faultId) {
      throw createApiServiceError('faultId is required for this action');
    }

    switch (action) {
      case 'resolve':
        await client.updateFault(projectId, faultId, { resolved: true });
        return { output: { success: true }, message: `Resolved error **${faultId}**.` };

      case 'unresolve':
        await client.updateFault(projectId, faultId, { resolved: false });
        return { output: { success: true }, message: `Unresolved error **${faultId}**.` };

      case 'ignore':
        await client.updateFault(projectId, faultId, { ignored: true });
        return { output: { success: true }, message: `Ignored error **${faultId}**.` };

      case 'unignore':
        await client.updateFault(projectId, faultId, { ignored: false });
        return { output: { success: true }, message: `Unignored error **${faultId}**.` };

      case 'assign':
        if (!Number.isSafeInteger(assigneeId) || (assigneeId ?? 0) <= 0)
          throw createApiServiceError('assigneeId is required for assign action');
        await client.updateFault(projectId, faultId, { assigneeId });
        return {
          output: { success: true },
          message: `Assigned error **${faultId}** to user ${assigneeId}.`
        };

      case 'pause': {
        if (pauseTime && pauseCount !== undefined)
          throw createApiServiceError('Use either pauseTime or pauseCount, not both.');
        if (pauseCount !== undefined && ![10, 100, 1000].includes(pauseCount))
          throw createApiServiceError('pauseCount must be 10, 100, or 1000.');
        let pause: { time?: string; count?: number } = {};
        if (pauseTime) pause.time = pauseTime;
        else if (pauseCount) pause.count = pauseCount;
        else
          throw createApiServiceError(
            'Either pauseTime or pauseCount is required for pause action'
          );
        await client.pauseFault(projectId, faultId, pause);
        return {
          output: { success: true },
          message: `Paused notifications for error **${faultId}**.`
        };
      }

      case 'unpause':
        await client.unpauseFault(projectId, faultId);
        return {
          output: { success: true },
          message: `Unpaused notifications for error **${faultId}**.`
        };

      case 'delete':
        await client.deleteFault(projectId, faultId);
        return { output: { success: true }, message: `Deleted error **${faultId}**.` };

      case 'comment': {
        if (!commentBody)
          throw createApiServiceError('commentBody is required for comment action');
        let result = await client.createComment(projectId, faultId, commentBody);
        return {
          output: { success: true, commentId: result.id },
          message: `Added comment to error **${faultId}**.`
        };
      }

      case 'delete_comment': {
        if (!ctx.input.commentId)
          throw createApiServiceError('commentId is required for delete_comment.');
        await client.deleteComment(projectId, faultId, ctx.input.commentId);
        return { output: { success: true }, message: 'Deleted the comment.' };
      }
      default:
        throw createApiServiceError(`Unknown action: ${action}`);
    }
  })
  .build();
