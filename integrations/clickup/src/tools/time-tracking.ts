import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let getTimeEntries = SlateTool.create(spec, {
  name: 'Get Time Entries',
  key: 'get_time_entries',
  description: `Retrieve time tracking entries from the workspace. Filter by date range, assignee, or specific task/list/space. Requires the Time Tracking ClickApp to be enabled.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .string()
        .optional()
        .describe('Start of date range as Unix timestamp in milliseconds'),
      endDate: z
        .string()
        .optional()
        .describe('End of date range as Unix timestamp in milliseconds'),
      assignee: z.string().optional().describe('User ID to filter by assignee'),
      taskId: z.string().optional().describe('Filter by specific task ID'),
      listId: z.string().optional().describe('Filter by specific list ID'),
      spaceId: z.string().optional().describe('Filter by specific space ID')
    })
  )
  .output(
    z.object({
      entries: z.array(
        z.object({
          timeEntryId: z.string(),
          taskId: z.string().optional(),
          taskName: z.string().optional(),
          description: z.string().optional(),
          duration: z.string().describe('Duration in milliseconds'),
          start: z.string().describe('Start time as Unix timestamp in milliseconds'),
          end: z.string().optional().describe('End time as Unix timestamp in milliseconds'),
          userId: z.string().optional(),
          userName: z.string().optional(),
          billable: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let entries = await client.getTimeEntries(ctx.config.workspaceId, {
      startDate: ctx.input.startDate ? Number(ctx.input.startDate) : undefined,
      endDate: ctx.input.endDate ? Number(ctx.input.endDate) : undefined,
      assignee: ctx.input.assignee,
      taskId: ctx.input.taskId,
      listId: ctx.input.listId,
      spaceId: ctx.input.spaceId
    });

    return {
      output: {
        entries: (entries ?? []).map((e: any) => ({
          timeEntryId: e.id,
          taskId: e.task?.id,
          taskName: e.task?.name,
          description: e.description,
          duration: String(e.duration),
          start: String(e.start),
          end: e.end ? String(e.end) : undefined,
          userId: e.user ? String(e.user.id) : undefined,
          userName: e.user?.username,
          billable: e.billable
        }))
      },
      message: `Found **${(entries ?? []).length}** time entry/entries.`
    };
  })
  .build();

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Log a completed time entry in ClickUp. Specify the start time and duration. Optionally associate it with a task.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      start: z.string().describe('Start time as Unix timestamp in milliseconds'),
      duration: z.number().describe('Duration in milliseconds'),
      taskId: z.string().optional().describe('Task ID to associate the entry with'),
      description: z.string().optional().describe('Description of the work done'),
      assignee: z.number().optional().describe('User ID to assign the entry to'),
      billable: z.boolean().optional().describe('Whether the entry is billable'),
      tags: z.array(z.string()).optional().describe('Tag names for the time entry')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let entry = await client.createTimeEntry(ctx.config.workspaceId, {
      start: Number(ctx.input.start),
      duration: ctx.input.duration,
      taskId: ctx.input.taskId,
      description: ctx.input.description,
      assignee: ctx.input.assignee,
      billable: ctx.input.billable,
      tags: ctx.input.tags?.map(name => ({ name }))
    });

    return {
      output: {
        timeEntryId: entry.id
      },
      message: `Created time entry (${entry.id}) for ${ctx.input.duration}ms.`
    };
  })
  .build();

export let startTimer = SlateTool.create(spec, {
  name: 'Start Timer',
  key: 'start_timer',
  description: `Start a running timer in ClickUp. Optionally associate it with a task.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Task ID to track time against'),
      description: z.string().optional().describe('Description of the work'),
      billable: z.boolean().optional().describe('Whether the time is billable')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().optional(),
      started: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let entry = await client.startTimer(ctx.config.workspaceId, {
      taskId: ctx.input.taskId,
      description: ctx.input.description,
      billable: ctx.input.billable
    });

    return {
      output: {
        timeEntryId: entry?.id,
        started: true
      },
      message: `Timer started${ctx.input.taskId ? ` for task ${ctx.input.taskId}` : ''}.`
    };
  })
  .build();

export let stopTimer = SlateTool.create(spec, {
  name: 'Stop Timer',
  key: 'stop_timer',
  description: `Stop the currently running timer in the workspace.`,
  tags: {
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      timeEntryId: z.string().optional(),
      stopped: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let entry = await client.stopTimer(ctx.config.workspaceId);

    return {
      output: {
        timeEntryId: entry?.id,
        stopped: true
      },
      message: `Timer stopped${entry?.id ? ` (entry ${entry.id})` : ''}.`
    };
  })
  .build();
