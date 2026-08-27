import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTimeEntries = SlateTool.create(spec, {
  name: 'Get Time Entries',
  key: 'get_time_entries',
  description: `Retrieve time tracking entries from the ClickUp Workspace selected by workspaceId. Call get_workspaces to discover authorized Workspace IDs. Filter by date range, assignee, or specific task/list/space. Requires the Time Tracking ClickApp to be enabled.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
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
    let entries = await client.getTimeEntries(ctx.input.workspaceId, {
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
  description: `Log a completed time entry in the ClickUp Workspace selected by workspaceId. Call get_workspaces to discover authorized Workspace IDs. Specify the start time and duration, and optionally associate it with a task.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
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
    let entry = await client.createTimeEntry(ctx.input.workspaceId, {
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

export let updateTimeEntry = SlateTool.create(spec, {
  name: 'Update Time Entry',
  key: 'update_time_entry',
  description: `Update a time entry in the ClickUp Workspace selected by workspaceId. Call get_workspaces to discover authorized Workspace IDs. Update its task, description, start/end time, duration, assignee, tags, or billable flag.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      timeEntryId: z.string().describe('The time entry ID to update'),
      start: z.string().optional().describe('Start time as Unix timestamp in milliseconds'),
      end: z.string().optional().describe('End time as Unix timestamp in milliseconds'),
      duration: z.number().optional().describe('Duration in milliseconds'),
      taskId: z.string().optional().describe('Task ID to associate the entry with'),
      description: z.string().optional().describe('Updated description of the work'),
      assignee: z.number().optional().describe('User ID to assign the entry to'),
      billable: z.boolean().optional().describe('Whether the entry is billable'),
      tags: z.array(z.string()).optional().describe('Tag names for the time entry')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let entry = await client.updateTimeEntry(ctx.input.workspaceId, ctx.input.timeEntryId, {
      start: ctx.input.start ? Number(ctx.input.start) : undefined,
      end: ctx.input.end ? Number(ctx.input.end) : undefined,
      duration: ctx.input.duration,
      taskId: ctx.input.taskId,
      description: ctx.input.description,
      assignee: ctx.input.assignee,
      billable: ctx.input.billable,
      tags: ctx.input.tags?.map(name => ({ name }))
    });

    return {
      output: {
        timeEntryId: String(entry?.id ?? ctx.input.timeEntryId),
        updated: true
      },
      message: `Updated time entry ${ctx.input.timeEntryId}.`
    };
  })
  .build();

export let deleteTimeEntry = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description: `Delete a time entry from the ClickUp Workspace selected by workspaceId. Call get_workspaces to discover authorized Workspace IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      timeEntryId: z.string().describe('The time entry ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    await client.deleteTimeEntry(ctx.input.workspaceId, ctx.input.timeEntryId);

    return {
      output: { deleted: true },
      message: `Deleted time entry ${ctx.input.timeEntryId}.`
    };
  })
  .build();

export let getRunningTimer = SlateTool.create(spec, {
  name: 'Get Running Timer',
  key: 'get_running_timer',
  description: `Retrieve the currently running timer in the ClickUp Workspace selected by workspaceId. Call get_workspaces to discover authorized Workspace IDs. Supports the authenticated user or a specified assignee.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      assignee: z.string().optional().describe('User ID to retrieve a running timer for')
    })
  )
  .output(
    z.object({
      running: z.boolean(),
      timeEntryId: z.string().optional(),
      taskId: z.string().optional(),
      description: z.string().optional(),
      duration: z.string().optional(),
      start: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let entry = await client.getRunningTimer(ctx.input.workspaceId, ctx.input.assignee);

    return {
      output: {
        running: Boolean(entry?.id),
        timeEntryId: entry?.id,
        taskId: entry?.task?.id ?? entry?.tid,
        description: entry?.description,
        duration: entry?.duration !== undefined ? String(entry.duration) : undefined,
        start: entry?.start !== undefined ? String(entry.start) : undefined
      },
      message: entry?.id ? `Found running timer ${entry.id}.` : 'No running timer found.'
    };
  })
  .build();

export let startTimer = SlateTool.create(spec, {
  name: 'Start Timer',
  key: 'start_timer',
  description: `Start a running timer in the ClickUp Workspace selected by workspaceId. Call get_workspaces to discover authorized Workspace IDs. Optionally associate it with a task.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
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
    let entry = await client.startTimer(ctx.input.workspaceId, {
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
  description: `Stop the currently running timer in the ClickUp Workspace selected by workspaceId. Call get_workspaces to discover authorized Workspace IDs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().optional(),
      stopped: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let entry = await client.stopTimer(ctx.input.workspaceId);

    return {
      output: {
        timeEntryId: entry?.id,
        stopped: true
      },
      message: `Timer stopped${entry?.id ? ` (entry ${entry.id})` : ''}.`
    };
  })
  .build();
