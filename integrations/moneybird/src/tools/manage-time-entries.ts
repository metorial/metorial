import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let timeEntrySchema = z.object({
  timeEntryId: z.string(),
  contactId: z.string().nullable(),
  projectId: z.string().nullable(),
  userId: z.string().nullable(),
  salesInvoiceId: z.string().nullable(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  description: z.string().nullable(),
  pausedDuration: z.number().nullable(),
  billable: z.boolean().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable()
});

export let manageTimeEntries = SlateTool.create(spec, {
  name: 'Manage Time Entries',
  key: 'manage_time_entries',
  description: `List, get, create, update, or delete time entries. Time entries track time spent on projects and can be billed to customers by converting them to invoices.`,
  instructions: [
    'For "list", use filter to narrow results (e.g., "state:open", "period:this_month", "contact_id:123", "project_id:456").',
    'For "create", provide startedAt and endedAt in ISO 8601 format.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      timeEntryId: z.string().optional().describe('Time entry ID (for get, update, delete)'),
      filter: z
        .string()
        .optional()
        .describe('Filter string for list (e.g., "state:open,period:this_month")'),
      query: z.string().optional().describe('Search by description (for list)'),
      page: z.number().optional().describe('Page number (for list)'),
      perPage: z.number().optional().describe('Results per page (for list)'),
      startedAt: z.string().optional().describe('Start time ISO 8601 (for create/update)'),
      endedAt: z.string().optional().describe('End time ISO 8601 (for create/update)'),
      description: z.string().optional().describe('Work description (for create/update)'),
      contactId: z.string().optional().describe('Contact ID (for create/update)'),
      projectId: z.string().optional().describe('Project ID (for create/update)'),
      billable: z
        .boolean()
        .optional()
        .describe('Whether the time entry is billable (for create/update)')
    })
  )
  .output(
    z.object({
      timeEntry: timeEntrySchema.optional(),
      timeEntries: z.array(timeEntrySchema).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let mapEntry = (e: any) => ({
      timeEntryId: String(e.id),
      contactId: e.contact_id ? String(e.contact_id) : null,
      projectId: e.project_id ? String(e.project_id) : null,
      userId: e.user_id ? String(e.user_id) : null,
      salesInvoiceId: e.sales_invoice_id ? String(e.sales_invoice_id) : null,
      startedAt: e.started_at || null,
      endedAt: e.ended_at || null,
      description: e.description || null,
      pausedDuration: e.paused_duration ?? null,
      billable: e.billable ?? null,
      createdAt: e.created_at || null,
      updatedAt: e.updated_at || null
    });

    switch (ctx.input.action) {
      case 'list': {
        let entries = await client.listTimeEntries({
          filter: ctx.input.filter,
          query: ctx.input.query,
          page: ctx.input.page,
          perPage: ctx.input.perPage
        });
        let mapped = entries.map(mapEntry);
        return {
          output: { timeEntries: mapped },
          message: `Found ${mapped.length} time entr${mapped.length === 1 ? 'y' : 'ies'}.`
        };
      }
      case 'get': {
        if (!ctx.input.timeEntryId) throw new Error('timeEntryId is required for get');
        let entry = await client.getTimeEntry(ctx.input.timeEntryId);
        return {
          output: { timeEntry: mapEntry(entry) },
          message: `Retrieved time entry: "${entry.description || entry.id}".`
        };
      }
      case 'create': {
        let entryData: Record<string, any> = {};
        if (ctx.input.startedAt) entryData.started_at = ctx.input.startedAt;
        if (ctx.input.endedAt) entryData.ended_at = ctx.input.endedAt;
        if (ctx.input.description) entryData.description = ctx.input.description;
        if (ctx.input.contactId) entryData.contact_id = ctx.input.contactId;
        if (ctx.input.projectId) entryData.project_id = ctx.input.projectId;
        if (ctx.input.billable !== undefined) entryData.billable = ctx.input.billable;
        let entry = await client.createTimeEntry(entryData);
        return {
          output: { timeEntry: mapEntry(entry) },
          message: `Created time entry: "${entry.description || entry.id}".`
        };
      }
      case 'update': {
        if (!ctx.input.timeEntryId) throw new Error('timeEntryId is required for update');
        let entryData: Record<string, any> = {};
        if (ctx.input.startedAt !== undefined) entryData.started_at = ctx.input.startedAt;
        if (ctx.input.endedAt !== undefined) entryData.ended_at = ctx.input.endedAt;
        if (ctx.input.description !== undefined) entryData.description = ctx.input.description;
        if (ctx.input.contactId !== undefined) entryData.contact_id = ctx.input.contactId;
        if (ctx.input.projectId !== undefined) entryData.project_id = ctx.input.projectId;
        if (ctx.input.billable !== undefined) entryData.billable = ctx.input.billable;
        let entry = await client.updateTimeEntry(ctx.input.timeEntryId, entryData);
        return {
          output: { timeEntry: mapEntry(entry) },
          message: `Updated time entry: "${entry.description || entry.id}".`
        };
      }
      case 'delete': {
        if (!ctx.input.timeEntryId) throw new Error('timeEntryId is required for delete');
        await client.deleteTimeEntry(ctx.input.timeEntryId);
        return {
          output: { deleted: true },
          message: `Deleted time entry ${ctx.input.timeEntryId}.`
        };
      }
    }
  });
