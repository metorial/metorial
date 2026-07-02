import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaceUpClient } from '../lib/client';
import { spec } from '../spec';

export let getReportStatistics = SlateTool.create(spec, {
  name: 'Get Report Statistics',
  key: 'get_report_statistics',
  description: `Retrieve aggregated report statistics from FaceUp, including report counts by month. Useful for building compliance dashboards, generating periodic reports, or tracking reporting trends over time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z
        .string()
        .optional()
        .describe(
          'ISO 8601 date string to filter statistics from (e.g., "2024-01-01T00:00:00.000Z"). If omitted, returns all available statistics.'
        )
    })
  )
  .output(
    z.object({
      reportCountByMonth: z.any().describe('Report counts aggregated by month')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaceUpClient({
      token: ctx.auth.token,
      region: ctx.auth.region
    });

    let statistics = await client.getReportStatistics(ctx.input.dateFrom);

    return {
      output: {
        reportCountByMonth: statistics.reportCountByMonth
      },
      message: ctx.input.dateFrom
        ? `Retrieved report statistics from ${ctx.input.dateFrom}.`
        : `Retrieved all available report statistics.`
    };
  })
  .build();
