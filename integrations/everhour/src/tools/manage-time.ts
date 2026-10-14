import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let timeRecordSchema = z.object({
  timeRecordId: z.number().describe('Time record ID'),
  timeSeconds: z.number().describe('Logged time in seconds'),
  userId: z.number().describe('User who logged the time'),
  date: z.string().describe('Date of the time record (YYYY-MM-DD)'),
  taskId: z.string().optional().describe('Associated task ID'),
  taskName: z.string().optional().describe('Associated task name'),
  isLocked: z.boolean().optional().describe('Whether the record is locked'),
  isInvoiced: z.boolean().optional().describe('Whether the record is invoiced'),
  comment: z.string().optional().describe('Notes on the time record')
});

export let listTimeRecords = SlateTool.create(spec, {
  name: 'List Time Records',
  key: 'list_time_records',
  description: `Retrieve time records filtered by team, user, task, or project. Always supports date range filtering. Useful for reviewing logged hours and generating reports.`,
  constraints: [
    'Maximum of 50,000 records per request.',
    'Date range filtering is recommended for large datasets.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      scope: z
        .enum(['team', 'user', 'task', 'project'])
        .describe('Scope of time records to retrieve'),
      userId: z.number().optional().describe('User ID (required when scope is "user")'),
      taskId: z.string().optional().describe('Task ID (required when scope is "task")'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID (required when scope is "project")'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a whole number within the safe integer range')
        .min(1)
        .max(50000)
        .optional()
        .describe('Maximum number of records (1-50,000)'),
      page: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a whole number within the safe integer range')
        .min(1)
        .optional()
        .describe('Page number for pagination, starting at 1')
    })
  )
  .output(
    z.object({
      timeRecords: z.array(timeRecordSchema).describe('List of time records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let records: any[];
    let params = {
      from: ctx.input.from,
      to: ctx.input.to,
      limit: ctx.input.limit,
      page: ctx.input.page
    };

    switch (ctx.input.scope) {
      case 'user':
        if (ctx.input.userId === undefined) {
          throw createApiServiceError(
            'userId is required when scope is "user". Call list_users to find user IDs.'
          );
        }
        records = await client.listUserTime(ctx.input.userId, params);
        break;
      case 'task':
        if (!ctx.input.taskId?.trim()) {
          throw createApiServiceError(
            'taskId is required when scope is "task". Call list_tasks to find task IDs.'
          );
        }
        records = await client.listTaskTime(ctx.input.taskId, params);
        break;
      case 'project':
        if (!ctx.input.projectId?.trim()) {
          throw createApiServiceError(
            'projectId is required when scope is "project". Call list_projects to find project IDs.'
          );
        }
        records = await client.listProjectTime(ctx.input.projectId, params);
        break;
      default:
        records = await client.listTeamTime(params);
    }

    let mapped = records.map((r: any) => ({
      timeRecordId: r.id,
      timeSeconds: r.time,
      userId: r.user,
      date: r.date,
      taskId: r.task?.id ?? undefined,
      taskName: r.task?.name ?? undefined,
      isLocked: r.isLocked ?? undefined,
      isInvoiced: r.isInvoiced ?? undefined,
      comment: r.comment ?? undefined
    }));

    return {
      output: { timeRecords: mapped },
      message: `Found **${mapped.length}** time record(s).`
    };
  });

export let logTime = SlateTool.create(spec, {
  name: 'Log Time',
  key: 'log_time',
  description: `Manually log time against a task. Time is specified in seconds. Optionally assign to a specific user and add a comment.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      timeSeconds: z.number().describe('Time to log in seconds'),
      date: z.string().describe('Date for the time record (YYYY-MM-DD)'),
      taskId: z.string().optional().describe('Task ID to log time against'),
      userId: z
        .number()
        .optional()
        .describe('User ID to log time for (defaults to authenticated user)'),
      comment: z.string().optional().describe('Comment or notes for the time record')
    })
  )
  .output(timeRecordSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let result = await client.logTime({
      time: ctx.input.timeSeconds,
      date: ctx.input.date,
      task: ctx.input.taskId,
      user: ctx.input.userId,
      comment: ctx.input.comment
    });
    return {
      output: {
        timeRecordId: result.id,
        timeSeconds: result.time,
        userId: result.user,
        date: result.date,
        taskId: result.task?.id ?? undefined,
        taskName: result.task?.name ?? undefined,
        isLocked: result.isLocked ?? undefined,
        isInvoiced: result.isInvoiced ?? undefined,
        comment: result.comment ?? undefined
      },
      message: `Logged **${Math.round(ctx.input.timeSeconds / 60)} minutes** on ${ctx.input.date}.`
    };
  });

export let updateTimeRecord = SlateTool.create(spec, {
  name: 'Update Time Record',
  key: 'update_time_record',
  description: `Update an existing time record's logged time, date, task assignment, or comment.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      timeRecordId: z.number().describe('ID of the time record to update'),
      timeSeconds: z.number().optional().describe('Updated time in seconds'),
      date: z.string().optional().describe('Updated date (YYYY-MM-DD)'),
      taskId: z.string().optional().describe('Move to a different task'),
      userId: z.number().optional().describe('Reassign to a different user'),
      comment: z.string().optional().describe('Updated comment')
    })
  )
  .output(timeRecordSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let { timeRecordId, timeSeconds, taskId, userId, ...rest } = ctx.input;
    let result = await client.updateTimeRecord(timeRecordId, {
      ...rest,
      time: timeSeconds,
      task: taskId,
      user: userId
    });
    return {
      output: {
        timeRecordId: result.id,
        timeSeconds: result.time,
        userId: result.user,
        date: result.date,
        taskId: result.task?.id ?? undefined,
        taskName: result.task?.name ?? undefined,
        isLocked: result.isLocked ?? undefined,
        isInvoiced: result.isInvoiced ?? undefined,
        comment: result.comment ?? undefined
      },
      message: `Updated time record ${timeRecordId}.`
    };
  });

export let deleteTimeRecord = SlateTool.create(spec, {
  name: 'Delete Time Record',
  key: 'delete_time_record',
  description: `Permanently delete a time record.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      timeRecordId: z.number().describe('ID of the time record to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    await client.deleteTimeRecord(ctx.input.timeRecordId);
    return {
      output: { success: true },
      message: `Deleted time record ${ctx.input.timeRecordId}.`
    };
  });
