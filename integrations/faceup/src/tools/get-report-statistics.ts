import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaceUpClient } from '../lib/client';
import { statisticsInputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getReportStatistics = SlateTool.create(spec, {
  name: 'Get Report Statistics',
  key: 'get_report_statistics',
  description: `Retrieve aggregated report statistics from FaceUp, including report counts by month. Filter by dates, status, origin, priority, source, justification, closing reason, deadline, tag, or rating. Select additional counts, timing metrics, and breakdowns for compliance dashboards.`,
  tags: {
    readOnly: true
  }
})
  .input(statisticsInputSchema)
  .output(
    z.object({
      reportCountByMonth: z.any().describe('Report counts aggregated by month'),
      statistics: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Selected statistics exactly as returned by FaceUp, including monthly counts and any null comparison values.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaceUpClient({
      token: ctx.auth.token,
      region: ctx.auth.region
    });

    let statistics = await client.getReportStatistics(ctx.input);

    return {
      output: {
        reportCountByMonth: statistics.reportCountByMonth,
        statistics
      },
      message: ctx.input.dateFrom
        ? `Retrieved report statistics from ${ctx.input.dateFrom}.`
        : `Retrieved report statistics.`
    };
  })
  .build();
