import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

export let updateError = SlateTool.create(spec, {
  name: 'Update Error',
  key: 'update_error',
  description: `Update the status or assignment of a Bugsnag error. Set the error status to open, fixed, snoozed, or ignored, assign it to a collaborator, or update its severity. Multiple explicitly identified errors and fields are applied as separate provider operations. Earlier changes remain if a later operation fails; results are read back before reporting success.`,
  tags: {
    destructive: true,
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
    const client = new BugsnagClient(ctx.auth);
    const projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');
    if (ctx.input.errorId && ctx.input.errorIds?.length)
      throw createApiServiceError('Supply errorId or errorIds, not both.');
    const ids = [
      ...new Set(
        ctx.input.errorIds?.length
          ? ctx.input.errorIds
          : ctx.input.errorId
            ? [ctx.input.errorId]
            : []
      )
    ];
    if (!ids.length || ids.some(id => !id.trim()))
      throw createApiServiceError('Supply at least one non-blank error ID.');
    if (ids.length > 100)
      throw createApiServiceError(
        'Update at most 100 explicitly identified errors per invocation.'
      );
    const operations: Record<string, unknown>[] = [];
    if (ctx.input.severity !== undefined)
      operations.push({ operation: 'override_severity', severity: ctx.input.severity });
    if (ctx.input.assignedCollaboratorId !== undefined)
      operations.push({
        operation: 'assign',
        assigned_collaborator_id: ctx.input.assignedCollaboratorId
      });
    if (ctx.input.status !== undefined)
      operations.push({
        operation: { open: 'open', fixed: 'fix', snoozed: 'snooze', ignored: 'ignore' }[
          ctx.input.status
        ]
      });
    if (!operations.length)
      throw createApiServiceError(
        'Supply status, severity, or assignedCollaboratorId to update.'
      );
    let completed = 0;
    let status: string | undefined;
    for (const id of ids) {
      try {
        for (const operation of operations) await client.updateError(projectId, id, operation);
        const actual = await client.getError(projectId, id);
        if (actual.id !== id)
          throw createApiServiceError('Bugsnag returned a different error after updating.');
        if (
          ctx.input.severity !== undefined &&
          (actual.overridden_severity ?? actual.severity) !== ctx.input.severity
        )
          throw createApiServiceError('Bugsnag did not apply the requested severity.');
        if (
          ctx.input.assignedCollaboratorId !== undefined &&
          (actual.assigned_collaborator_id ?? '') !== ctx.input.assignedCollaboratorId
        )
          throw createApiServiceError(
            'Bugsnag did not apply the requested assignee. Confirm the collaborator accepted their invitation and can access the project.'
          );
        if (ctx.input.status !== undefined && actual.status !== ctx.input.status)
          throw createApiServiceError('Bugsnag did not apply the requested error status.');
        status = actual.status ?? undefined;
        completed++;
      } catch (error) {
        throw createApiServiceError(
          `Error update stopped after ${completed} of ${ids.length} errors completed. Earlier changes remain; inspect the requested IDs before retrying. ${error instanceof Error ? error.message : 'Provider request failed.'}`,
          { reason: 'partial_update', parent: error }
        );
      }
    }
    return {
      output: {
        updated: true,
        errorId: ids.length === 1 ? ids[0] : undefined,
        errorCount: completed,
        status
      },
      message: `Updated and read back **${completed}** error(s).`
    };
  })
  .build();
