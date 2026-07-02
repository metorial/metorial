import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let reportEntrySchema = z.object({
  kpiId: z.number().describe('KPI identifier'),
  kpiName: z.string().describe('KPI display name'),
  kpiDescription: z.string().nullable().describe('KPI description'),
  itemId: z.number().describe('Associated group item identifier'),
  itemName: z.string().nullable().describe('Group item display name'),
  periodId: z.string().describe('Period code (e.g., D, W, M)'),
  period: z.string().describe('Period description (e.g., Daily, Weekly)'),
  labelFormat: z.string().nullable().describe('Number formatting template'),
  isPercentage: z.number().describe('Whether value is a percentage (0 or 1)'),
  hasTarget: z.number().describe('Whether KPI has a target (0 or 1)'),
  direction: z.string().describe('Trend direction code'),
  directionName: z.string().describe('Direction label (e.g., Up, Down)'),
  entryDate: z.string().describe('Entry date (YYYY-MM-DD)'),
  actual: z.number().nullable().describe('Actual value'),
  target: z.number().nullable().describe('Target value'),
  notes: z.string().nullable().describe('Associated notes')
});

export let getKpiReport = SlateTool.create(spec, {
  name: 'Get KPI Report',
  key: 'get_kpi_report',
  description: `Query processed KPI data entries for reporting, including calculated KPIs. Filter by KPI IDs, date range, user IDs, and group item IDs. This is the primary way to extract aggregated performance data. Unlike "List KPI Entries", this endpoint returns calculated KPI values and formatted report data.`,
  constraints: [
    'Maximum 10,000 entries returned per request.',
    'Both dateFrom and dateTo are required.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z.string().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().describe('End date (YYYY-MM-DD)'),
      kpiIds: z.array(z.number()).optional().describe('Filter by specific KPI IDs'),
      userIds: z.array(z.number()).optional().describe('Filter by specific user IDs'),
      groupItemIds: z
        .array(z.number())
        .optional()
        .describe('Filter by specific group item IDs')
    })
  )
  .output(
    z.object({
      entries: z.array(reportEntrySchema).describe('Report data entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let reportParams: {
      kpiIds?: string;
      dateFrom: string;
      dateTo: string;
      groupItemIds?: string;
      userIds?: string;
    } = {
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo
    };

    if (ctx.input.kpiIds && ctx.input.kpiIds.length > 0) {
      reportParams.kpiIds = ctx.input.kpiIds.join(',');
    }
    if (ctx.input.userIds && ctx.input.userIds.length > 0) {
      reportParams.userIds = ctx.input.userIds.join(',');
    }
    if (ctx.input.groupItemIds && ctx.input.groupItemIds.length > 0) {
      reportParams.groupItemIds = ctx.input.groupItemIds.join(',');
    }

    let data = await client.getReport(reportParams);
    let entries = (Array.isArray(data) ? data : []).map((e: any) => ({
      kpiId: e.kpiId,
      kpiName: e.kpiName,
      kpiDescription: e.kpiDescription ?? null,
      itemId: e.itemId,
      itemName: e.itemName ?? null,
      periodId: e.periodId,
      period: e.period,
      labelFormat: e.labelFormat ?? null,
      isPercentage: e.isPercentage,
      hasTarget: e.hasTarget,
      direction: e.direction,
      directionName: e.directionName,
      entryDate: e.entryDate,
      actual: e.actual ?? null,
      target: e.target ?? null,
      notes: e.notes ?? null
    }));

    return {
      output: { entries },
      message: `Retrieved **${entries.length}** report entries from ${ctx.input.dateFrom} to ${ctx.input.dateTo}.`
    };
  })
  .build();
