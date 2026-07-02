import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Logs a new time entry in Rocketlane against a project and optionally a specific task. Supports specifying duration, date, description, and category.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to log time against'),
      taskId: z.number().optional().describe('ID of the task to log time against'),
      userId: z
        .number()
        .optional()
        .describe('ID of the user logging time (defaults to API key owner)'),
      duration: z.number().describe('Duration in minutes'),
      date: z.string().describe('Date of the time entry in YYYY-MM-DD format'),
      description: z.string().optional().describe('Description of the work performed'),
      categoryId: z.number().optional().describe('ID of the time entry category')
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().describe('Unique ID of the created time entry'),
      projectId: z.number().optional().describe('Project ID'),
      taskId: z.number().nullable().optional().describe('Task ID'),
      duration: z.number().optional().describe('Duration in minutes'),
      date: z.string().optional().describe('Date of the entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createTimeEntry({
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      userId: ctx.input.userId,
      duration: ctx.input.duration,
      date: ctx.input.date,
      description: ctx.input.description,
      categoryId: ctx.input.categoryId
    });

    return {
      output: result,
      message: `Time entry of **${ctx.input.duration} minutes** logged successfully (ID: ${result.timeEntryId}).`
    };
  })
  .build();

export let updateTimeEntry = SlateTool.create(spec, {
  name: 'Update Time Entry',
  key: 'update_time_entry',
  description: `Updates an existing time entry in Rocketlane. Supports changing duration, date, description, and category.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      timeEntryId: z.number().describe('ID of the time entry to update'),
      duration: z.number().optional().describe('New duration in minutes'),
      date: z.string().optional().describe('New date in YYYY-MM-DD format'),
      description: z.string().optional().describe('New description'),
      categoryId: z.number().optional().describe('New category ID')
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().describe('ID of the updated time entry'),
      duration: z.number().optional().describe('Updated duration'),
      date: z.string().optional().describe('Updated date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateTimeEntry(ctx.input.timeEntryId, {
      duration: ctx.input.duration,
      date: ctx.input.date,
      description: ctx.input.description,
      categoryId: ctx.input.categoryId
    });

    return {
      output: result,
      message: `Time entry ${ctx.input.timeEntryId} updated successfully.`
    };
  })
  .build();

export let deleteTimeEntry = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description: `Permanently deletes a time entry from Rocketlane.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      timeEntryId: z.number().describe('ID of the time entry to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTimeEntry(ctx.input.timeEntryId);

    return {
      output: { success: true },
      message: `Time entry ${ctx.input.timeEntryId} has been **deleted**.`
    };
  })
  .build();

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `Lists time entries in Rocketlane with optional filtering by project or user. Also provides time entry categories for reference.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Filter by project ID'),
      userId: z.number().optional().describe('Filter by user ID'),
      includeCategories: z
        .boolean()
        .optional()
        .describe('Also return available time entry categories'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of entries to return')
    })
  )
  .output(
    z.object({
      timeEntries: z
        .array(
          z.object({
            timeEntryId: z.number().describe('Time entry ID'),
            projectId: z.number().optional().describe('Project ID'),
            taskId: z.number().nullable().optional().describe('Task ID'),
            duration: z.number().optional().describe('Duration in minutes'),
            date: z.string().optional().describe('Date'),
            description: z.string().nullable().optional().describe('Description')
          })
        )
        .describe('List of time entries'),
      categories: z.array(z.any()).optional().describe('Available time entry categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTimeEntries({
      projectId: ctx.input.projectId,
      userId: ctx.input.userId,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let timeEntries = Array.isArray(result)
      ? result
      : (result.timeEntries ?? result.data ?? []);

    let categories: any[] | undefined;
    if (ctx.input.includeCategories) {
      let catResult = await client.listTimeEntryCategories();
      categories = Array.isArray(catResult)
        ? catResult
        : (catResult.categories ?? catResult.data ?? []);
    }

    return {
      output: { timeEntries, categories },
      message: `Found **${timeEntries.length}** time entry(ies).`
    };
  })
  .build();
