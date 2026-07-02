import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let entrySchema = z.object({
  entryId: z.number().describe('Entry identifier'),
  userId: z.number().describe('User who recorded the entry'),
  kpiId: z.number().describe('KPI the entry is for'),
  entryDate: z.string().describe('Date of the entry'),
  actual: z.number().nullable().describe('Actual value'),
  target: z.number().nullable().describe('Target value'),
  notes: z.string().nullable().describe('Entry notes'),
  createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
  updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
});

export let listKpiEntries = SlateTool.create(spec, {
  name: 'List KPI Entries',
  key: 'list_kpi_entries',
  description: `Retrieve KPI data entries with optional filters for user, KPI, date range, and pagination. Returns raw entry data (not calculated KPIs). Use the "Get KPI Report" tool for calculated/aggregated data.`,
  constraints: ['Maximum 500 entries per page.', 'Dates default to today if not specified.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().optional().describe('Filter by user ID'),
      kpiId: z.number().optional().describe('Filter by KPI ID'),
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD). Defaults to today.'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.'),
      rows: z.number().optional().describe('Number of rows per page (max 500)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      entries: z.array(entrySchema).describe('List of KPI entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let entries = await client.listKpiEntries({
      userid: ctx.input.userId,
      kpiid: ctx.input.kpiId,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      rows: ctx.input.rows,
      page: ctx.input.page
    });

    let mapped = (Array.isArray(entries) ? entries : []).map((e: any) => ({
      entryId: e.id,
      userId: e.user_id,
      kpiId: e.kpi_id,
      entryDate: e.entry_date,
      actual: e.actual ?? null,
      target: e.target ?? null,
      notes: e.notes ?? null,
      createdAt: e.created_at ?? null,
      updatedAt: e.updated_at ?? null
    }));

    return {
      output: { entries: mapped },
      message: `Retrieved **${mapped.length}** KPI entries.`
    };
  })
  .build();
