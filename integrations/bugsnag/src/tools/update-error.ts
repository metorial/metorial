import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

export let updateError = SlateTool.create(spec, {
  name: 'Update Error',
  key: 'update_error',
  description: `Update the status or assignment of a Bugsnag error. Set the error status to open, fixed, snoozed, or ignored, assign it to a collaborator, or update its severity. Can also bulk-update multiple errors at once.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID the error(s) belong to'),
      errorId: z
        .string()
        .optional()
        .describe('Single error ID to update (for individual update)'),
      errorIds: z.array(z.string()).optional().describe('Multiple error IDs to bulk update'),
      status: z
        .enum(['open', 'fixed', 'snoozed', 'ignored'])
        .optional()
        .describe('New error status'),
      severity: z.enum(['error', 'warning', 'info']).optional().describe('New severity level'),
      assignedCollaboratorId: z
        .string()
        .optional()
        .describe('Collaborator ID to assign the error to')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the update was successful'),
      errorId: z.string().optional().describe('Updated error ID (for single update)'),
      errorCount: z.number().optional().describe('Number of errors updated (for bulk update)'),
      status: z.string().optional().describe('New status after update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient({ token: ctx.auth.token });
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('Project ID is required.');

    let updateData: Record<string, any> = {};
    if (ctx.input.status) updateData.status = ctx.input.status;
    if (ctx.input.severity) updateData.severity = ctx.input.severity;
    if (ctx.input.assignedCollaboratorId)
      updateData.assigned_collaborator_id = ctx.input.assignedCollaboratorId;

    if (ctx.input.errorIds && ctx.input.errorIds.length > 0) {
      await client.bulkUpdateErrors(projectId, {
        operation: 'update',
        errorIds: ctx.input.errorIds,
        ...updateData
      });

      return {
        output: {
          updated: true,
          errorCount: ctx.input.errorIds.length,
          status: ctx.input.status
        },
        message: `Bulk updated **${ctx.input.errorIds.length}** errors.${ctx.input.status ? ` Status set to **${ctx.input.status}**.` : ''}`
      };
    }

    if (!ctx.input.errorId) throw new Error('Either errorId or errorIds is required.');

    let error = await client.updateError(projectId, ctx.input.errorId, updateData);

    return {
      output: {
        updated: true,
        errorId: error.id,
        status: error.status
      },
      message: `Updated error \`${error.id}\`.${ctx.input.status ? ` Status: **${ctx.input.status}**.` : ''}${ctx.input.assignedCollaboratorId ? ` Assigned to \`${ctx.input.assignedCollaboratorId}\`.` : ''}`
    };
  })
  .build();
