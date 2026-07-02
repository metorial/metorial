import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialerClient } from '../lib/client';
import { spec } from '../spec';

let durationMetricsSchema = z
  .object({
    sum: z.number().optional().describe('Total duration'),
    count: z.number().optional().describe('Number of occurrences'),
    min: z.number().optional().describe('Minimum duration'),
    max: z.number().optional().describe('Maximum duration')
  })
  .describe('Duration metrics');

let directionStatsSchema = z
  .object({
    all: z.number().optional().describe('Total calls in this direction'),
    success: z.number().optional().describe('Successful calls'),
    fail: z.number().optional().describe('Failed calls'),
    talks: z.number().optional().describe('Calls with talk time'),
    error: z.number().optional().describe('Error calls'),
    unique: z.number().optional().describe('Unique number calls'),
    firstTime: z.number().optional().describe('First-time calls'),
    active: z.number().optional().describe('Active calls'),
    totalDuration: durationMetricsSchema.optional().describe('Total duration metrics'),
    callDuration: durationMetricsSchema.optional().describe('Call duration metrics'),
    answerDuration: durationMetricsSchema.optional().describe('Answer duration metrics')
  })
  .describe('Statistics broken down by call direction');

export let getDialerStatistics = SlateTool.create(spec, {
  name: 'Get Dialer Call Statistics',
  key: 'get_dialer_statistics',
  description: `Retrieve aggregated call statistics from the Power Dialer product. Returns metrics broken down by call direction (all, inbound, outbound, internal) including success/fail counts, talk times, answer times, and AI talk time. Use this for dashboards and performance analysis.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'Requires a Power Dialer API key (dialerToken in auth).',
    'The same filters available for call reports also apply here.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dayFrom: z.string().describe('Start date in YYYY-MM-DD format'),
      dayTo: z.string().describe('End date in YYYY-MM-DD format'),
      searchString: z.string().optional().describe('Text search filter'),
      timezone: z.string().optional().describe('Timezone for the query'),
      types: z
        .array(z.number())
        .optional()
        .describe('Call types: 0=inbound, 1=outbound, 2=internal'),
      states: z
        .array(z.number())
        .optional()
        .describe('Call states: 0=unanswered, 1=answered, 2=failed'),
      agentIds: z.array(z.string()).optional().describe('Filter by agent IDs'),
      teamIds: z.array(z.string()).optional().describe('Filter by team IDs'),
      projectIds: z.array(z.string()).optional().describe('Filter by project IDs'),
      tags: z.array(z.string()).optional().describe('Filter by call tags'),
      outcomes: z.array(z.string()).optional().describe('Filter by call outcomes'),
      talkTimeFrom: z.number().optional().describe('Minimum talk time in seconds'),
      talkTimeTo: z.number().optional().describe('Maximum talk time in seconds'),
      answerTimeFrom: z.number().optional().describe('Minimum answer time in seconds'),
      answerTimeTo: z.number().optional().describe('Maximum answer time in seconds')
    })
  )
  .output(
    z.object({
      allCalls: directionStatsSchema.optional().describe('Statistics for all calls'),
      inboundCalls: directionStatsSchema.optional().describe('Statistics for inbound calls'),
      outboundCalls: directionStatsSchema.optional().describe('Statistics for outbound calls'),
      internalCalls: directionStatsSchema.optional().describe('Statistics for internal calls'),
      aiTalkTime: z.number().optional().describe('Total AI talk time in seconds'),
      allTalkTime: z.number().optional().describe('Total combined talk time in seconds'),
      tagsSuccess: z.number().optional().describe('Calls tagged as success'),
      tagsFail: z.number().optional().describe('Calls tagged as fail'),
      tagsDefault: z.number().optional().describe('Calls with default tag'),
      tagsNoResult: z.number().optional().describe('Calls with no result tag')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.dialerToken) {
      throw new Error(
        'Power Dialer API key (dialerToken) is required for this action. Please configure it in your authentication settings.'
      );
    }

    let client = new DialerClient({
      apiKey: ctx.auth.dialerToken
    });

    let result = await client.getCallStatistics(ctx.input);

    let stats = result.detailedStat || {};

    let mapDirectionStats = (dir: any) => {
      if (!dir) return undefined;
      return {
        all: dir.all,
        success: dir.success,
        fail: dir.fail,
        talks: dir.talks,
        error: dir.error,
        unique: dir.unique,
        firstTime: dir.firstTime,
        active: dir.active,
        totalDuration: dir.total
          ? {
              sum: dir.total.sum,
              count: dir.total.count,
              min: dir.total.min,
              max: dir.total.max
            }
          : undefined,
        callDuration: dir.call
          ? {
              sum: dir.call.sum,
              count: dir.call.count,
              min: dir.call.min,
              max: dir.call.max
            }
          : undefined,
        answerDuration: dir.answer
          ? {
              sum: dir.answer.sum,
              count: dir.answer.count,
              min: dir.answer.min,
              max: dir.answer.max
            }
          : undefined
      };
    };

    let output = {
      allCalls: mapDirectionStats(stats.all),
      inboundCalls: mapDirectionStats(stats.in),
      outboundCalls: mapDirectionStats(stats.out),
      internalCalls: mapDirectionStats(stats.our),
      aiTalkTime: stats.aiTalkTime,
      allTalkTime: stats.allTalkTime,
      tagsSuccess: stats.tagsSuccess,
      tagsFail: stats.tagsFail,
      tagsDefault: stats.tagsDefault,
      tagsNoResult: stats.tagsNoResult
    };

    let totalAll = output.allCalls?.all ?? 0;
    let totalSuccess = output.allCalls?.success ?? 0;

    return {
      output,
      message: `Dialer statistics for ${ctx.input.dayFrom} to ${ctx.input.dayTo}: **${totalAll}** total calls, **${totalSuccess}** successful. Inbound: ${output.inboundCalls?.all ?? 0}, Outbound: ${output.outboundCalls?.all ?? 0}, Internal: ${output.internalCalls?.all ?? 0}.`
    };
  })
  .build();
