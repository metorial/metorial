import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSurveyResults = SlateTool.create(spec, {
  name: 'Get Survey Results',
  key: 'get_survey_results',
  description: `Retrieve aggregated survey result averages for a business, including average answers and response counts for each survey question. Filter by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: z.number().describe('Business ID to get survey results for'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      questions: z
        .array(
          z.object({
            title: z.string().optional().describe('Survey question text'),
            averageAnswer: z.any().optional().describe('Mean response value'),
            answersCount: z.any().optional().describe('Total responses received')
          })
        )
        .describe('Survey question results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getSurveyAverages({
      businessId: ctx.input.businessId,
      from: ctx.input.from,
      to: ctx.input.to
    });

    if (data.errorCode !== 0) {
      throw new Error(
        `Failed to get survey results: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    let questions: Record<string, unknown>[] = [];
    let i = 1;
    while (data[`title${i}`] !== undefined) {
      questions.push({
        title: data[`title${i}`],
        averageAnswer: data[`averageAnswer${i}`],
        answersCount: data[`answersCount${i}`]
      });
      i++;
    }

    return {
      output: { questions } as any,
      message: `Retrieved **${questions.length}** survey question result(s) for business **${ctx.input.businessId}**.`
    };
  })
  .build();
