import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

export let getUsageAndIndexTool = SlateTool.create(spec, {
  name: 'Get API Usage & Index Status',
  key: 'get_usage_and_index',
  description: `Retrieve your Moz API usage data and the current index metadata. Returns the number of API rows consumed in a time period and the current index ID (which changes when the link index is updated). Useful for monitoring API consumption and checking data freshness.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startTimestamp: z
        .string()
        .optional()
        .describe('Start time as Unix timestamp string (seconds since epoch)'),
      endTimestamp: z
        .string()
        .optional()
        .describe('End time as Unix timestamp string (seconds since epoch)'),
      includeIndexMetadata: z
        .boolean()
        .optional()
        .describe('Also fetch index metadata (default: true)')
    })
  )
  .output(
    z.object({
      rowsConsumed: z
        .number()
        .optional()
        .describe('Number of API rows consumed in the period'),
      indexId: z
        .string()
        .optional()
        .describe('Current index ID (changes when data is updated)'),
      spamScoreUpdateDays: z
        .array(z.string())
        .optional()
        .describe('Dates when spam score updates occurred')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });
    let includeIndex = ctx.input.includeIndexMetadata !== false;

    let [usageResult, indexResult] = await Promise.all([
      client.getUsageData({
        start: ctx.input.startTimestamp,
        end: ctx.input.endTimestamp
      }),
      includeIndex ? client.getIndexMetadata() : Promise.resolve(null)
    ]);

    return {
      output: {
        rowsConsumed: usageResult?.rows_consumed,
        indexId: indexResult?.index_id,
        spamScoreUpdateDays: indexResult?.spam_score_update_days
      },
      message: `API usage: **${usageResult?.rows_consumed ?? 'N/A'}** rows consumed.${indexResult ? ` Index ID: \`${indexResult.index_id}\`` : ''}`
    };
  })
  .build();
