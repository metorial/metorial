import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let clockEntrySchema = z.object({
  entryId: z.number().describe('Clock entry ID'),
  userId: z.number().optional().describe('Employee user ID'),
  startTime: z.string().optional().describe('Clock-in time'),
  endTime: z.string().optional().describe('Clock-out time'),
  notes: z.string().optional().describe('Entry notes'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapClockEntry = (e: any) => ({
  entryId: e.id,
  userId: e.user_id,
  startTime: e.start_time,
  endTime: e.end_time,
  notes: e.notes,
  createdAt: e.created_at,
  updatedAt: e.updated_at
});

export let listClockEntries = SlateTool.create(spec, {
  name: 'List Clock Entries',
  key: 'list_clock_entries',
  description: `List employee time clock entries. Filter by user or date range to view clock-in/clock-out records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().optional().describe('Filter by employee user ID'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter entries before this date (YYYY-MM-DD)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter entries after this date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      entries: z.array(clockEntrySchema),
      totalPages: z.number().optional(),
      totalEntries: z.number().optional(),
      page: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listClockEntries(ctx.input);
    let entries = (result.employee_clock_entries || result.clock_entries || []).map(
      mapClockEntry
    );

    return {
      output: {
        entries,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${entries.length}** clock entry(ies).`
    };
  })
  .build();

export let createClockEntry = SlateTool.create(spec, {
  name: 'Create Clock Entry',
  key: 'create_clock_entry',
  description: `Create a new employee time clock entry for clock-in/clock-out tracking. Can be used for NFC badge systems, IoT buttons, or custom mobile apps.`
})
  .input(
    z.object({
      userId: z.number().describe('Employee user ID'),
      startTime: z.string().describe('Clock-in time (ISO 8601 format)'),
      endTime: z
        .string()
        .optional()
        .describe('Clock-out time (ISO 8601 format). Leave empty for an open clock-in.'),
      notes: z.string().optional().describe('Entry notes')
    })
  )
  .output(clockEntrySchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createClockEntry(ctx.input);
    let e = result.employee_clock_entry || result.clock_entry || result;

    return {
      output: mapClockEntry(e),
      message: `Created clock entry for user **${ctx.input.userId}** starting at ${ctx.input.startTime}${ctx.input.endTime ? ` ending at ${ctx.input.endTime}` : ' (open)'}.`
    };
  })
  .build();

export let updateClockEntry = SlateTool.create(spec, {
  name: 'Update Clock Entry',
  key: 'update_clock_entry',
  description: `Update an employee time clock entry, such as adding a clock-out time or correcting times.`
})
  .input(
    z.object({
      entryId: z.number().describe('The clock entry ID to update'),
      startTime: z.string().optional().describe('Updated clock-in time'),
      endTime: z.string().optional().describe('Updated clock-out time'),
      notes: z.string().optional().describe('Updated notes')
    })
  )
  .output(clockEntrySchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let { entryId, ...updateData } = ctx.input;
    let result = await client.updateClockEntry(entryId, updateData);
    let e = result.employee_clock_entry || result.clock_entry || result;

    return {
      output: mapClockEntry(e),
      message: `Updated clock entry **${ctx.input.entryId}**.`
    };
  })
  .build();
