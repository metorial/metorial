import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { spec } from '../spec';

export let getSurveyStatisticsTool = SlateTool.create(spec, {
  name: 'Get Survey Statistics',
  key: 'get_survey_statistics',
  description: `Retrieve aggregated statistics for a specific survey, including response counts, rates, and question-level metrics. Optionally filter by date range for time-bound analysis.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey to get statistics for'),
      startDate: z.string().optional().describe('Start of the date range in ISO 8601 format'),
      endDate: z.string().optional().describe('End of the date range in ISO 8601 format')
    })
  )
  .output(
    z.object({
      statistics: z
        .any()
        .describe(
          'Aggregated statistics for the survey, including response counts, rates, and question-level metrics'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey);
    let result = await client.getSurveyStatistics({
      projectId: ctx.config.projectId,
      campaignId: ctx.input.surveyId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    return {
      output: { statistics: result?.data || result },
      message: `Retrieved statistics for survey **${ctx.input.surveyId}**.`
    };
  })
  .build();
