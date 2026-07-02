import { SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let reportEntrySchema = z.object({
  projectId: z.string().optional().describe('Project ID'),
  projectName: z.string().optional().describe('Project name'),
  clientId: z.number().optional().describe('Client ID'),
  clientName: z.string().optional().describe('Client name'),
  memberId: z.number().optional().describe('Member ID'),
  memberName: z.string().optional().describe('Member name'),
  totalTimeSeconds: z.number().optional().describe('Total tracked time in seconds'),
  billableTimeSeconds: z.number().optional().describe('Billable time in seconds'),
  nonBillableTimeSeconds: z.number().optional().describe('Non-billable time in seconds'),
  billableAmountCents: z.number().optional().describe('Billable amount in cents'),
  costsCents: z.number().optional().describe('Costs in cents'),
  profitCents: z.number().optional().describe('Profit in cents'),
  uninvoicedAmountCents: z.number().optional().describe('Uninvoiced amount in cents'),
  expensesCents: z.number().optional().describe('Total expenses in cents')
});

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Generate aggregated time and billing reports by projects, clients, or users. Reports include total time, billable/non-billable breakdown, amounts, costs, profit, and expenses. All monetary values are in cents.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      reportType: z
        .enum(['projects', 'clients', 'users'])
        .describe('Type of report to generate'),
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
      projectId: z.string().optional().describe('Filter by project ID'),
      clientId: z.number().optional().describe('Filter by client ID'),
      memberId: z.number().optional().describe('Filter by member ID')
    })
  )
  .output(
    z.object({
      entries: z.array(reportEntrySchema).describe('Report entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let params: any = {};
    if (ctx.input.dateFrom) params['date.gte'] = ctx.input.dateFrom;
    if (ctx.input.dateTo) params['date.lte'] = ctx.input.dateTo;
    if (ctx.input.projectId) params.projectId = ctx.input.projectId;
    if (ctx.input.clientId) params.clientId = ctx.input.clientId;
    if (ctx.input.memberId) params.memberId = ctx.input.memberId;

    let data: any[];
    switch (ctx.input.reportType) {
      case 'clients':
        data = await client.getClientsReport(params);
        break;
      case 'users':
        data = await client.getUsersReport(params);
        break;
      default:
        data = await client.getProjectsReport(params);
    }

    let entries = (Array.isArray(data) ? data : []).map((entry: any) => ({
      projectId: entry.projectId,
      projectName: entry.projectName,
      clientId: entry.clientId,
      clientName: entry.clientName,
      memberId: entry.memberId,
      memberName: entry.memberName,
      totalTimeSeconds: entry.time,
      billableTimeSeconds: entry.billableTime,
      nonBillableTimeSeconds: entry.nonBillableTime,
      billableAmountCents: entry.billableAmount,
      costsCents: entry.costs,
      profitCents: entry.profit,
      uninvoicedAmountCents: entry.uninvoicedAmount,
      expensesCents: entry.expenses
    }));

    return {
      output: { entries },
      message: `Generated **${ctx.input.reportType}** report with **${entries.length}** entries.`
    };
  });
