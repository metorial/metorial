import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPassStatistics = SlateTool.create(spec, {
  name: 'Get Pass Statistics',
  key: 'get_pass_statistics',
  description: `Retrieve statistics about passes for a specific template. Includes timelines showing when passes were created, updated, deleted, or saved, along with OS breakdowns. Can also retrieve daily active/inactive pass counts over a time range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template identifier to get statistics for'),
      timeFrame: z
        .enum(['day', 'week', 'month', 'year'])
        .describe('Time frame granularity for the statistics'),
      day: z.string().default('today').describe('Reference date ("today" or "Y-m-d" format)'),
      includeActiveHistory: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also retrieve daily active/inactive counts'),
      activeHistoryStartDay: z
        .string()
        .optional()
        .describe(
          'Start date for active history ("Y-m-d" format, required if includeActiveHistory is true)'
        )
    })
  )
  .output(
    z.object({
      statistics: z
        .record(z.string(), z.any())
        .describe('Pass statistics including timelines, OS breakdowns, and counts'),
      activeHistory: z
        .record(z.string(), z.any())
        .optional()
        .describe('Daily active/inactive pass counts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let statistics = await client.getPassStatistics(
      ctx.input.templateId,
      ctx.input.timeFrame,
      ctx.input.day
    );

    let activeHistory: any | undefined;
    if (ctx.input.includeActiveHistory && ctx.input.activeHistoryStartDay) {
      activeHistory = await client.getActiveHistory(
        ctx.input.templateId,
        ctx.input.activeHistoryStartDay
      );
    }

    return {
      output: { statistics, activeHistory },
      message: `Retrieved ${ctx.input.timeFrame} statistics for template \`${ctx.input.templateId}\`.`
    };
  })
  .build();
