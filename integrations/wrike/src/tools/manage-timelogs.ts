import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let listTimelogs = SlateTool.create(spec, {
  name: 'List Timelogs',
  key: 'list_timelogs',
  description: `List time log entries. Can filter by task, user/contact, folder, and date ranges.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Task ID to list timelogs for'),
      contactId: z.string().optional().describe('Contact/user ID to list timelogs for'),
      folderId: z.string().optional().describe('Folder/project ID to list timelogs for'),
      trackedDateStart: z
        .string()
        .optional()
        .describe('Filter by tracked date start (ISO 8601)'),
      trackedDateEnd: z.string().optional().describe('Filter by tracked date end (ISO 8601)')
    })
  )
  .output(
    z.object({
      timelogs: z.array(
        z.object({
          timelogId: z.string(),
          taskId: z.string(),
          userId: z.string(),
          hours: z.number(),
          trackedDate: z.string(),
          comment: z.string().optional(),
          categoryId: z.string().optional(),
          createdDate: z.string(),
          updatedDate: z.string()
        })
      ),
      totalHours: z.number(),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let trackedDate =
      ctx.input.trackedDateStart || ctx.input.trackedDateEnd
        ? { start: ctx.input.trackedDateStart, end: ctx.input.trackedDateEnd }
        : undefined;

    let result = await client.getTimelogs({
      taskId: ctx.input.taskId,
      contactId: ctx.input.contactId,
      folderId: ctx.input.folderId,
      trackedDate
    });

    let timelogs = result.data.map(t => ({
      timelogId: t.id,
      taskId: t.taskId,
      userId: t.userId,
      hours: t.hours,
      trackedDate: t.trackedDate,
      comment: t.comment,
      categoryId: t.categoryId,
      createdDate: t.createdDate,
      updatedDate: t.updatedDate
    }));

    let totalHours = timelogs.reduce((sum, t) => sum + t.hours, 0);

    return {
      output: { timelogs, totalHours, count: timelogs.length },
      message: `Found **${timelogs.length}** timelog(s) totaling **${totalHours}** hours.`
    };
  })
  .build();

export let createTimelog = SlateTool.create(spec, {
  name: 'Create Timelog',
  key: 'create_timelog',
  description: `Log time against a task. Specify the hours worked, the date the work was performed, and an optional comment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to log time against'),
      hours: z.number().describe('Number of hours to log'),
      trackedDate: z.string().describe('Date the work was performed (YYYY-MM-DD)'),
      comment: z.string().optional().describe('Comment describing the work'),
      categoryId: z.string().optional().describe('Timelog category ID')
    })
  )
  .output(
    z.object({
      timelogId: z.string(),
      taskId: z.string(),
      userId: z.string(),
      hours: z.number(),
      trackedDate: z.string(),
      comment: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let timelog = await client.createTimelog(ctx.input.taskId, {
      hours: ctx.input.hours,
      trackedDate: ctx.input.trackedDate,
      comment: ctx.input.comment,
      categoryId: ctx.input.categoryId
    });

    return {
      output: {
        timelogId: timelog.id,
        taskId: timelog.taskId,
        userId: timelog.userId,
        hours: timelog.hours,
        trackedDate: timelog.trackedDate,
        comment: timelog.comment
      },
      message: `Logged **${timelog.hours}** hours on task ${timelog.taskId}.`
    };
  })
  .build();

export let updateTimelog = SlateTool.create(spec, {
  name: 'Update Timelog',
  key: 'update_timelog',
  description: `Update an existing timelog entry's hours, tracked date, comment, or category.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      timelogId: z.string().describe('ID of the timelog to update'),
      hours: z.number().optional().describe('Updated hours'),
      trackedDate: z.string().optional().describe('Updated tracked date (YYYY-MM-DD)'),
      comment: z.string().optional().describe('Updated comment'),
      categoryId: z.string().optional().describe('Updated category ID')
    })
  )
  .output(
    z.object({
      timelogId: z.string(),
      taskId: z.string(),
      userId: z.string(),
      hours: z.number(),
      trackedDate: z.string(),
      comment: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let timelog = await client.updateTimelog(ctx.input.timelogId, {
      hours: ctx.input.hours,
      trackedDate: ctx.input.trackedDate,
      comment: ctx.input.comment,
      categoryId: ctx.input.categoryId
    });

    return {
      output: {
        timelogId: timelog.id,
        taskId: timelog.taskId,
        userId: timelog.userId,
        hours: timelog.hours,
        trackedDate: timelog.trackedDate,
        comment: timelog.comment
      },
      message: `Updated timelog ${timelog.id} to **${timelog.hours}** hours.`
    };
  })
  .build();

export let deleteTimelog = SlateTool.create(spec, {
  name: 'Delete Timelog',
  key: 'delete_timelog',
  description: `Delete a time log entry.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      timelogId: z.string().describe('ID of the timelog to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    await client.deleteTimelog(ctx.input.timelogId);

    return {
      output: { deleted: true },
      message: `Deleted timelog ${ctx.input.timelogId}.`
    };
  })
  .build();
