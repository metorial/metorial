import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
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
      projectId: z.string().describe('Project ID'),
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
          'comment'
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
      commentBody: z.string().optional().describe('Comment text (for comment action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      commentId: z
        .number()
        .optional()
        .describe('ID of the created comment (for comment action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient({ token: ctx.auth.token });
    let { projectId, action, faultId, assigneeId, pauseTime, pauseCount, query, commentBody } =
      ctx.input;

    if (action === 'bulk_resolve') {
      await client.bulkResolveFaults(projectId, query);
      return {
        output: { success: true },
        message: `Bulk resolved errors${query ? ` matching "${query}"` : ''} in project ${projectId}.`
      };
    }

    if (!faultId) {
      throw new Error('faultId is required for this action');
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
        if (!assigneeId) throw new Error('assigneeId is required for assign action');
        await client.updateFault(projectId, faultId, { assigneeId });
        return {
          output: { success: true },
          message: `Assigned error **${faultId}** to user ${assigneeId}.`
        };

      case 'pause': {
        let pause: { time?: string; count?: number } = {};
        if (pauseTime) pause.time = pauseTime;
        else if (pauseCount) pause.count = pauseCount;
        else throw new Error('Either pauseTime or pauseCount is required for pause action');
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
        if (!commentBody) throw new Error('commentBody is required for comment action');
        let result = await client.createComment(projectId, faultId, commentBody);
        return {
          output: { success: true, commentId: result.id },
          message: `Added comment to error **${faultId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  })
  .build();
