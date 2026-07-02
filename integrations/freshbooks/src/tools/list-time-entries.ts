import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `Search and list time entries in FreshBooks. Supports filtering by date range, project, client, and billing status. Requires a **businessId** in the configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page'),
      projectId: z.number().optional().describe('Filter by project ID'),
      clientId: z.number().optional().describe('Filter by client ID'),
      billable: z.boolean().optional().describe('Filter by billable status'),
      billed: z.boolean().optional().describe('Filter by billed status'),
      startedFrom: z
        .string()
        .optional()
        .describe('Filter entries started after this date (YYYY-MM-DD)'),
      startedTo: z
        .string()
        .optional()
        .describe('Filter entries started before this date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      timeEntries: z.array(
        z.object({
          timeEntryId: z.number(),
          duration: z.number().nullable().optional(),
          startedAt: z.string().nullable().optional(),
          clientId: z.number().nullable().optional(),
          projectId: z.number().nullable().optional(),
          note: z.string().nullable().optional(),
          billable: z.boolean().nullable().optional(),
          billed: z.boolean().nullable().optional(),
          isLogged: z.boolean().nullable().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let params: Record<string, string | number> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;
    if (ctx.input.projectId) params.project_id = ctx.input.projectId;
    if (ctx.input.clientId) params.client_id = ctx.input.clientId;
    if (ctx.input.billable !== undefined) params.billable = ctx.input.billable ? 1 : 0;
    if (ctx.input.billed !== undefined) params.billed = ctx.input.billed ? 1 : 0;
    if (ctx.input.startedFrom) params.started_from = ctx.input.startedFrom;
    if (ctx.input.startedTo) params.started_to = ctx.input.startedTo;

    let result = await client.listTimeEntries(params);

    let timeEntries = (result.time_entries || []).map((t: any) => ({
      timeEntryId: t.id,
      duration: t.duration,
      startedAt: t.started_at,
      clientId: t.client_id,
      projectId: t.project_id,
      note: t.note,
      billable: t.billable,
      billed: t.billed,
      isLogged: t.is_logged
    }));

    return {
      output: {
        timeEntries,
        totalCount: result.meta?.total || timeEntries.length,
        currentPage: result.meta?.page || 1,
        totalPages: result.meta?.pages || 1
      },
      message: `Found **${result.meta?.total || timeEntries.length}** time entries.`
    };
  })
  .build();
