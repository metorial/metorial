import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSummary = SlateTool.create(spec, {
  name: 'Get Performance Summary',
  key: 'get_summary',
  description: `Retrieves aggregated performance summaries for an uptime check. Supports multiple report types:
- **average**: Average response time and uptime percentage for a period
- **performance**: Time-series performance data at hourly, daily, or weekly resolution (useful for graphs)
- **outage**: List of outage periods with timestamps
- **hoursofday**: Average response time broken down by hour of day`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      checkId: z.number().describe('ID of the check'),
      reportType: z
        .enum(['average', 'performance', 'outage', 'hoursofday'])
        .describe('Type of summary report to retrieve'),
      from: z.number().optional().describe('Start timestamp (Unix epoch)'),
      to: z.number().optional().describe('End timestamp (Unix epoch)'),
      resolution: z
        .enum(['hour', 'day', 'week'])
        .optional()
        .describe('Time resolution for performance reports'),
      includeUptime: z
        .boolean()
        .optional()
        .describe('Include uptime information (average/performance)'),
      probes: z.string().optional().describe('Comma-separated probe IDs to filter by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order (performance/outage)'),
      useLocalTime: z.boolean().optional().describe('Use local time for hours-of-day report')
    })
  )
  .output(
    z.object({
      summary: z.any().describe('Summary data (structure varies by report type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result: any;

    switch (ctx.input.reportType) {
      case 'average':
        result = await client.getSummaryAverage(ctx.input.checkId, {
          from: ctx.input.from,
          to: ctx.input.to,
          probes: ctx.input.probes,
          includeuptime: ctx.input.includeUptime
        });
        break;
      case 'performance':
        result = await client.getSummaryPerformance(ctx.input.checkId, {
          from: ctx.input.from,
          to: ctx.input.to,
          resolution: ctx.input.resolution,
          includeuptime: ctx.input.includeUptime,
          probes: ctx.input.probes,
          order: ctx.input.order
        });
        break;
      case 'outage':
        result = await client.getSummaryOutage(ctx.input.checkId, {
          from: ctx.input.from,
          to: ctx.input.to,
          order: ctx.input.order
        });
        break;
      case 'hoursofday':
        result = await client.getSummaryHoursOfDay(ctx.input.checkId, {
          from: ctx.input.from,
          to: ctx.input.to,
          probes: ctx.input.probes,
          uselocaltime: ctx.input.useLocalTime
        });
        break;
    }

    return {
      output: {
        summary: result.summary || result
      },
      message: `Retrieved **${ctx.input.reportType}** summary for check ${ctx.input.checkId}.`
    };
  })
  .build();
