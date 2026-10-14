import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimeEntry = SlateTool.create(spec, {
  name: 'Get Time Entry',
  key: 'get_time_entry',
  description:
    'Retrieve a time entry by ID, or list a page of timesheet entries. Returns resource and project IDs, dates, minutes, status, and locking information. The API defaults to 20 entries per page; continue paging until fewer than the requested limit are returned.',
  constraints: ['Requires the Timesheets extension to be enabled on the account.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      timeEntryId: z
        .string()
        .optional()
        .describe('Time entry ID. Omit to list a page of entries.'),
      page: z.number().int().min(0).optional().describe('Page number (0-based)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Entries per page; defaults to 20, maximum 1000')
    })
  )
  .output(
    z.object({
      timeEntries: z.array(
        z.object({
          timeEntryId: z.string().describe('Time entry ID'),
          resourceId: z.string().optional(),
          projectId: z.string().optional(),
          projectName: z.string().optional(),
          date: z.string().optional(),
          minutes: z.number().optional(),
          status: z.string().optional(),
          locked: z.boolean().optional(),
          note: z.string().optional(),
          metadata: z.string().optional(),
          categoryTemplateId: z.string().optional(),
          categoryName: z.string().optional(),
          createdDate: z.string().optional(),
          updatedDate: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let entries = ctx.input.timeEntryId
      ? [await client.getTimeEntry(ctx.input.timeEntryId)]
      : await client.getTimeEntries(ctx.input.page, ctx.input.limit);
    return {
      output: {
        timeEntries: entries.map((entry: any) => ({
          timeEntryId: entry._id,
          resourceId: entry.resource ?? undefined,
          projectId: entry.project ?? undefined,
          projectName: entry.projectName ?? undefined,
          date: entry.date ?? undefined,
          minutes: entry.minutes ?? undefined,
          status: entry.status ?? undefined,
          locked: entry.locked ?? undefined,
          note: entry.note ?? undefined,
          metadata: entry.metadata ?? undefined,
          categoryTemplateId: entry.categoryTemplateId ?? undefined,
          categoryName: entry.categoryName ?? undefined,
          createdDate: entry.createdDate ?? undefined,
          updatedDate: entry.updatedDate ?? undefined
        }))
      },
      message: `Retrieved **${entries.length}** time entries.`
    };
  })
  .build();
