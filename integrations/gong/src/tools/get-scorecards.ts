import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

export let getScorecards = SlateTool.create(spec, {
  name: 'Get Scorecards',
  key: 'get_scorecards',
  description: `Retrieve scorecard answers from Gong. Returns answers for scorecards reviewed during a date range, for specific scorecards, or for specific reviewed users. Useful for tracking coaching quality and call evaluations.`,
  instructions: [
    'At least one filter is required: date range (fromDateTime/toDateTime), scorecardIds, or reviewedUserIds.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDateTime: z
        .string()
        .optional()
        .describe('Start of review date range in ISO 8601 format'),
      toDateTime: z
        .string()
        .optional()
        .describe('End of review date range in ISO 8601 format'),
      scorecardIds: z
        .array(z.string())
        .optional()
        .describe('Filter by specific scorecard IDs'),
      reviewedUserIds: z.array(z.string()).optional().describe('Filter by reviewed user IDs'),
      reviewerUserIds: z.array(z.string()).optional().describe('Filter by reviewer user IDs'),
      callFromDateTime: z.string().optional().describe('Filter by call start date'),
      callToDateTime: z.string().optional().describe('Filter by call end date'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      answeredScorecards: z.array(z.any()).describe('Scorecard answer records'),
      totalRecords: z.number().optional().describe('Total number of records'),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.getAnsweredScorecards({
      filter: {
        fromDateTime: ctx.input.fromDateTime,
        toDateTime: ctx.input.toDateTime,
        scorecardIds: ctx.input.scorecardIds,
        reviewedUserIds: ctx.input.reviewedUserIds,
        reviewerUserIds: ctx.input.reviewerUserIds,
        callFromDateTime: ctx.input.callFromDateTime,
        callToDateTime: ctx.input.callToDateTime
      },
      cursor: ctx.input.cursor
    });

    let answeredScorecards = result.answeredScorecards || [];

    return {
      output: {
        answeredScorecards,
        totalRecords: result.records?.totalRecords,
        cursor: result.records?.cursor
      },
      message: `Retrieved ${answeredScorecards.length} scorecard answer(s).`
    };
  })
  .build();
