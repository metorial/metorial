import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { harvestAccountIdSchema, resolveHarvestAccountId } from '../lib/account-id';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

let externalReferenceSchema = z
  .object({
    id: z.string().describe('ID of the external reference'),
    groupId: z.string().optional().describe('Group ID of the external reference'),
    accountId: z.string().optional().describe('Account ID of the external reference'),
    permalink: z.string().optional().describe('URL of the external reference')
  })
  .optional()
  .describe('External reference for linking to third-party tools');

export let manageTimeEntry = SlateTool.create(spec, {
  name: 'Manage Time Entry',
  key: 'manage_time_entry',
  description: `Create, update, or delete a time entry in Harvest. Time entries can be created via duration (hours) or via start/end time. Supports associating entries with projects, tasks, and users. Can also link to external references like Trello cards or Basecamp to-dos. Call list_accounts to discover account IDs when choosing between multiple accounts.`,
  instructions: [
    'Use hours for accounts that track durations, or startedTime/endedTime for accounts that track timestamps. Omitting duration or end time starts a running timer. Check the account settings or get_company (administrators only) for the tracking mode.',
    'To delete a time entry, set action to "delete" and provide the timeEntryId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: harvestAccountIdSchema,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      timeEntryId: z
        .number()
        .optional()
        .describe('Time entry ID (required for update/delete)'),
      projectId: z.number().optional().describe('Project ID (required for create)'),
      taskId: z.number().optional().describe('Task ID (required for create)'),
      spentDate: z
        .string()
        .optional()
        .describe('Date the time was spent (YYYY-MM-DD, required for create)'),
      userId: z
        .number()
        .optional()
        .describe('User ID to assign the entry to (defaults to current user)'),
      hours: z
        .number()
        .optional()
        .describe('Number of hours tracked (for duration-based entries)'),
      startedTime: z
        .string()
        .optional()
        .describe('Start time (HH:MM format, for timer-based entries)'),
      endedTime: z
        .string()
        .optional()
        .describe('End time (HH:MM format, for timer-based entries)'),
      notes: z.string().optional().describe('Notes about the time entry'),
      externalReference: externalReferenceSchema
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().optional().describe('ID of the time entry'),
      projectName: z.string().optional().describe('Name of the associated project'),
      taskName: z.string().optional().describe('Name of the associated task'),
      spentDate: z.string().optional().describe('Date the time was spent'),
      hours: z.number().optional().describe('Hours logged'),
      notes: z.string().optional().nullable().describe('Notes on the time entry'),
      isRunning: z.boolean().optional().describe('Whether the timer is running'),
      deleted: z.boolean().optional().describe('Whether the entry was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: resolveHarvestAccountId(ctx)
    });

    if (
      ctx.input.action !== 'delete' &&
      ctx.input.hours !== undefined &&
      (ctx.input.startedTime !== undefined || ctx.input.endedTime !== undefined)
    ) {
      throw createApiServiceError(
        'Provide hours for a duration entry or startedTime/endedTime for a timestamp entry, not both.'
      );
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.timeEntryId) {
        throw createApiServiceError('timeEntryId is required for delete');
      }
      await client.deleteTimeEntry(ctx.input.timeEntryId);
      return {
        output: { timeEntryId: ctx.input.timeEntryId, deleted: true },
        message: `Deleted time entry **#${ctx.input.timeEntryId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.projectId || !ctx.input.taskId || !ctx.input.spentDate) {
        throw createApiServiceError(
          'projectId, taskId, and spentDate are required for create'
        );
      }
      let entry = await client.createTimeEntry({
        projectId: ctx.input.projectId,
        taskId: ctx.input.taskId,
        spentDate: ctx.input.spentDate,
        userId: ctx.input.userId,
        hours: ctx.input.hours,
        startedTime: ctx.input.startedTime,
        endedTime: ctx.input.endedTime,
        notes: ctx.input.notes,
        externalReference: ctx.input.externalReference
      });
      return {
        output: {
          timeEntryId: entry.id,
          projectName: entry.project?.name,
          taskName: entry.task?.name,
          spentDate: entry.spent_date,
          hours: entry.hours,
          notes: entry.notes,
          isRunning: entry.is_running
        },
        message: `Created time entry **#${entry.id}** for ${entry.hours}h on ${entry.spent_date}.`
      };
    }

    // update
    if (!ctx.input.timeEntryId) {
      throw createApiServiceError('timeEntryId is required for update');
    }
    let entry = await client.updateTimeEntry(ctx.input.timeEntryId, {
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      spentDate: ctx.input.spentDate,
      hours: ctx.input.hours,
      startedTime: ctx.input.startedTime,
      endedTime: ctx.input.endedTime,
      notes: ctx.input.notes,
      externalReference: ctx.input.externalReference
    });
    return {
      output: {
        timeEntryId: entry.id,
        projectName: entry.project?.name,
        taskName: entry.task?.name,
        spentDate: entry.spent_date,
        hours: entry.hours,
        notes: entry.notes,
        isRunning: entry.is_running
      },
      message: `Updated time entry **#${entry.id}** — ${entry.hours}h on ${entry.spent_date}.`
    };
  })
  .build();
