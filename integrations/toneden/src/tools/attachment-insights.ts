import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let totalsSchema = z.object({
  lastDay: z.number().optional().describe('Count in the last 24 hours'),
  lastWeek: z.number().optional().describe('Count in the last 7 days'),
  lastMonth: z.number().optional().describe('Count in the last 30 days'),
  total: z.number().optional().describe('All-time count')
});

export let attachmentInsights = SlateTool.create(spec, {
  name: 'Attachment Insights',
  key: 'attachment_insights',
  description: `Retrieve performance analytics for a social unlock or contest. Returns entry totals, unlock totals, platform breakdowns, and optional time-series data.
For **contests**, entry data shows how many fans entered over time.
For **social unlocks**, unlock data shows how many fans completed the required action and received the reward.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      attachmentId: z.number().describe('ID of the attachment to get insights for'),
      includeTimeSeries: z
        .boolean()
        .optional()
        .describe('Include time-series data for entries and unlocks'),
      aggregateInterval: z
        .enum(['hour', 'day', 'week'])
        .optional()
        .describe('Time interval for aggregation'),
      startDate: z.string().optional().describe('Start date for time-series (ISO 8601)')
    })
  )
  .output(
    z.object({
      entryTotals: totalsSchema.describe('Entry count summaries'),
      unlockTotals: totalsSchema.describe('Unlock count summaries'),
      platformBreakdown: z
        .array(
          z.object({
            platform: z.string().describe('Platform name'),
            count: z.number().describe('Unlock count for this platform')
          })
        )
        .describe('Unlock counts broken down by social platform'),
      entryTimeSeries: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Time-series entry data'),
      unlockTimeSeries: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Time-series unlock data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let { attachmentId } = ctx.input;

    let [entryTotals, unlockTotals, platforms] = await Promise.all([
      client.getAttachmentEntryTotals(attachmentId),
      client.getAttachmentUnlockTotals(attachmentId),
      client.getAttachmentUnlockPlatforms(attachmentId)
    ]);

    let output: any = {
      entryTotals: {
        lastDay: entryTotals?.last_day,
        lastWeek: entryTotals?.last_week,
        lastMonth: entryTotals?.last_month,
        total: entryTotals?.total
      },
      unlockTotals: {
        lastDay: unlockTotals?.last_day,
        lastWeek: unlockTotals?.last_week,
        lastMonth: unlockTotals?.last_month,
        total: unlockTotals?.total
      },
      platformBreakdown: (platforms || []).map((p: any) => ({
        platform: p.platform,
        count: p.count
      }))
    };

    if (ctx.input.includeTimeSeries) {
      let [entryTs, unlockTs] = await Promise.all([
        client.getAttachmentEntries(attachmentId, {
          aggregateInterval: ctx.input.aggregateInterval,
          startDate: ctx.input.startDate
        }),
        client.getAttachmentUnlocks(attachmentId, {
          aggregateInterval: ctx.input.aggregateInterval,
          startDate: ctx.input.startDate
        })
      ]);
      output.entryTimeSeries = entryTs;
      output.unlockTimeSeries = unlockTs;
    }

    return {
      output,
      message: `Attachment **${attachmentId}** insights: ${entryTotals?.total ?? 0} total entries, ${unlockTotals?.total ?? 0} total unlocks across ${(platforms || []).length} platform(s).`
    };
  })
  .build();
