import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

let projectConsumptionSchema = z.object({
  projectId: z.string().describe('ID of the project'),
  periods: z
    .array(
      z.object({
        periodId: z.string().describe('Billing period identifier'),
        periodPlan: z.string().describe('Billing plan for the period'),
        periodStart: z.string().describe('Start timestamp for the billing period'),
        periodEnd: z.string().optional().describe('End timestamp for the billing period'),
        consumption: z
          .array(z.record(z.string(), z.unknown()))
          .describe('Consumption timeframes and requested metrics')
      })
    )
    .describe('Consumption periods for the project')
});

export let getConsumption = SlateTool.create(spec, {
  name: 'Get Consumption',
  key: 'get_consumption',
  description: `Retrieves consumption metrics across all projects for the account. Tracks compute time, active time, storage, written data, and data transfer. Available on Neon paid plans.`,
  instructions: [
    'Requires a paid Neon plan. Will fail on free-tier accounts.',
    'The from/to parameters use ISO 8601 date-time format.',
    'Consumption history is available only for eligible paid plans.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.string().describe('Start date-time for the metrics period in ISO 8601 format'),
      to: z.string().describe('End date-time for the metrics period in ISO 8601 format'),
      granularity: z
        .enum(['hourly', 'daily', 'monthly'])
        .describe('Metric granularity for the requested date range'),
      orgId: z.string().optional().describe('Organization ID to filter consumption by'),
      projectIds: z
        .array(z.string())
        .optional()
        .describe('Project IDs to filter consumption by'),
      metrics: z
        .array(z.string())
        .optional()
        .describe('Consumption metric names to include. Defaults to Neon legacy metrics.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of project consumption records to return'),
      cursor: z.string().optional().describe('Pagination cursor for fetching next page')
    })
  )
  .output(
    z.object({
      projects: z.array(projectConsumptionSchema).describe('Consumption metrics per project'),
      cursor: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.getAccountConsumption({
      from: ctx.input.from,
      to: ctx.input.to,
      granularity: ctx.input.granularity,
      orgId: ctx.input.orgId,
      projectIds: ctx.input.projectIds,
      metrics: ctx.input.metrics,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let projects = (result.projects || []).map((p: any) => ({
      projectId: p.project_id,
      periods: (p.periods || []).map((period: any) => ({
        periodId: period.period_id,
        periodPlan: period.period_plan,
        periodStart: period.period_start,
        periodEnd: period.period_end,
        consumption: period.consumption || []
      }))
    }));

    return {
      output: {
        projects,
        cursor: result.pagination?.cursor
      },
      message: `Retrieved consumption metrics for **${projects.length}** project(s).`
    };
  })
  .build();
