import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTimeEntries = SlateTool.create(spec, {
  name: 'Search Time Entries',
  key: 'search_time_entries',
  description: `Search and filter timesheet entries using advanced query operators. Filter by resource, project, date ranges, and status. Use page and limit to retrieve additional results; the API returns 20 entries by default.
Use operators like **$in**, **$nin**, **$lt**, **$lte**, **$gt**, **$gte** for flexible querying.`,
  constraints: ['Requires the Timesheets extension to be enabled on the account.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().int().min(0).optional().describe('Page number (0-based)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Results per page, up to 1000'),
      resources: z
        .any()
        .optional()
        .describe('Filter by resource IDs (e.g. { "$in": ["resourceId1"] })'),
      project: z.any().optional().describe('Filter by project ID'),
      date: z
        .any()
        .optional()
        .describe('Filter by date (e.g. { "$gte": "2024-01-01", "$lte": "2024-12-31" })'),
      updatedDate: z.any().optional().describe('Filter by updated date'),
      status: z.any().optional().describe('Filter by status'),
      metadata: z.any().optional().describe('Filter by metadata')
    })
  )
  .output(
    z.object({
      timeEntries: z
        .array(
          z.object({
            timeEntryId: z.string().describe('Time entry ID'),
            resourceId: z.string().optional().describe('Resource ID'),
            projectId: z.string().optional().describe('Project ID'),
            date: z.string().optional().describe('Date'),
            minutes: z.number().optional().describe('Duration in minutes'),
            status: z.string().optional().describe('Status'),
            note: z.string().optional().describe('Note'),
            createdDate: z.string().optional().describe('Creation timestamp'),
            updatedDate: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('Matching time entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let filters: Record<string, any> = {};

    if (ctx.input.resources !== undefined) filters.resources = ctx.input.resources;
    if (ctx.input.project !== undefined) filters.project = ctx.input.project;
    if (ctx.input.date !== undefined) filters.date = ctx.input.date;
    if (ctx.input.updatedDate !== undefined) filters.updatedDate = ctx.input.updatedDate;
    if (ctx.input.status !== undefined) filters.status = ctx.input.status;
    if (ctx.input.metadata !== undefined) filters.metadata = ctx.input.metadata;

    let entries = await client.searchTimeEntries(filters, ctx.input.page, ctx.input.limit);
    return {
      output: {
        timeEntries: entries.map((e: any) => ({
          timeEntryId: e._id,
          resourceId: e.resource ?? undefined,
          projectId: e.project ?? undefined,
          date: e.date ?? undefined,
          minutes: e.minutes ?? undefined,
          status: e.status ?? undefined,
          note: e.note ?? undefined,
          createdDate: e.createdDate ?? undefined,
          updatedDate: e.updatedDate ?? undefined
        }))
      },
      message: `Found **${entries.length}** time entries matching the search criteria.`
    };
  })
  .build();
