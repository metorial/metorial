import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let timeEntrySchema = z.object({
  timeEntryId: z.number().describe('Unique ID of the time entry'),
  projectId: z.number().optional().describe('Associated project ID'),
  userId: z.number().optional().describe('Staff user ID who logged the time'),
  title: z.string().describe('Title or description of work performed'),
  hours: z.number().describe('Number of hours logged'),
  rate: z.number().optional().describe('Hourly rate applied'),
  date: z.string().optional().describe('Date of the time entry (YYYY-MM-DD)'),
  description: z.string().optional().describe('Additional details'),
  billed: z.boolean().optional().describe('Whether the time has been billed'),
  cost: z.number().optional().describe('Total cost (hours * rate)')
});

export let logTime = SlateTool.create(spec, {
  name: 'Log Time',
  key: 'log_time',
  description: `Log a time entry against a project. The authenticated user is automatically attributed for the entry. Each entry tracks hours worked, rate, and billing status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID to log time against'),
      title: z.string().describe('Title describing the work performed (required)'),
      hours: z.number().describe('Number of hours to log (required)'),
      date: z
        .string()
        .optional()
        .describe('Date of the entry (YYYY-MM-DD). Defaults to today.'),
      rate: z.number().optional().describe('Hourly rate. Defaults to project rate.'),
      description: z.string().optional().describe('Additional details about the work')
    })
  )
  .output(timeEntrySchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {
      title: ctx.input.title,
      hours: ctx.input.hours
    };
    if (ctx.input.date) data.date = ctx.input.date;
    if (ctx.input.rate !== undefined) data.rate = ctx.input.rate;
    if (ctx.input.description) data.description = ctx.input.description;

    let result = await client.createHour(ctx.input.projectId, data);
    let h = result.hour || result;

    return {
      output: mapTimeEntry(h),
      message: `Logged **${h.hours}h** for "${h.title}" on project ID ${ctx.input.projectId}.`
    };
  })
  .build();

export let updateTimeEntry = SlateTool.create(spec, {
  name: 'Update Time Entry',
  key: 'update_time_entry',
  description: `Update an existing time entry's details including hours, title, rate, or date.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      timeEntryId: z.number().describe('ID of the time entry to update'),
      title: z.string().optional().describe('Title describing the work'),
      hours: z.number().optional().describe('Number of hours'),
      date: z.string().optional().describe('Date of the entry (YYYY-MM-DD)'),
      rate: z.number().optional().describe('Hourly rate'),
      description: z.string().optional().describe('Additional details')
    })
  )
  .output(timeEntrySchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {};
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.hours !== undefined) data.hours = ctx.input.hours;
    if (ctx.input.date !== undefined) data.date = ctx.input.date;
    if (ctx.input.rate !== undefined) data.rate = ctx.input.rate;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;

    let result = await client.updateHour(ctx.input.timeEntryId, data);
    let h = result.hour || result;

    return {
      output: mapTimeEntry(h),
      message: `Updated time entry **${h.id}** — ${h.hours}h for "${h.title}".`
    };
  })
  .build();

export let getTimeEntries = SlateTool.create(spec, {
  name: 'Get Time Entries',
  key: 'get_time_entries',
  description: `List time entries for a project, or retrieve a single time entry by ID. Can be filtered by billed/unbilled status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      timeEntryId: z.number().optional().describe('ID of a specific time entry to retrieve'),
      projectId: z
        .number()
        .optional()
        .describe(
          'Project ID to list time entries for (required if timeEntryId is not provided)'
        ),
      filter: z.enum(['billed', 'unbilled']).optional().describe('Filter by billing status'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      timeEntries: z.array(timeEntrySchema).describe('List of time entries'),
      totalCount: z.number().optional().describe('Total number of matching entries'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    if (ctx.input.timeEntryId) {
      let result = await client.getHour(ctx.input.timeEntryId);
      let h = result.hour || result;
      return {
        output: { timeEntries: [mapTimeEntry(h)] },
        message: `Retrieved time entry **${h.id}** — ${h.hours}h for "${h.title}".`
      };
    }

    if (!ctx.input.projectId) {
      throw new Error('projectId is required when timeEntryId is not provided');
    }

    let result = await client.listHours(ctx.input.projectId, {
      page: ctx.input.page,
      filter: ctx.input.filter
    });

    let timeEntries = (result.hours || []).map(mapTimeEntry);

    return {
      output: {
        timeEntries,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${timeEntries.length} time entry(ies) for project ID ${ctx.input.projectId}.`
    };
  })
  .build();

export let deleteTimeEntry = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description: `Permanently delete a time entry.`,
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
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteHour(ctx.input.timeEntryId);

    return {
      output: { success: true },
      message: `Deleted time entry ID ${ctx.input.timeEntryId}.`
    };
  })
  .build();

let mapTimeEntry = (h: any) => ({
  timeEntryId: h.id,
  projectId: h.project_id,
  userId: h.user_id,
  title: h.title,
  hours: h.hours,
  rate: h.rate,
  date: h.date,
  description: h.description,
  billed: h.billed,
  cost: h.cost
});
