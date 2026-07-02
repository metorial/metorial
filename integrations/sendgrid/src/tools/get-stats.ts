import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let statsMetricsSchema = z.object({
  requests: z.number().describe('Number of emails requested to be delivered'),
  delivered: z.number().describe('Number of emails delivered'),
  opens: z.number().describe('Total opens'),
  uniqueOpens: z.number().describe('Unique opens'),
  clicks: z.number().describe('Total clicks'),
  uniqueClicks: z.number().describe('Unique clicks'),
  bounces: z.number().describe('Number of bounced emails'),
  blocks: z.number().describe('Number of blocked emails'),
  spamReports: z.number().describe('Number of spam reports'),
  bounceDrops: z.number().describe('Number of bounce drops'),
  deferred: z.number().describe('Number of deferred emails'),
  invalid: z.number().describe('Number of invalid emails'),
  processed: z.number().describe('Number of processed emails'),
  unsubscribes: z.number().describe('Number of unsubscribes'),
  unsubscribeDrops: z.number().describe('Number of unsubscribe drops'),
  spamReportDrops: z.number().describe('Number of spam report drops')
});

let statsEntrySchema = z.object({
  date: z.string().describe('Date for this stats entry (YYYY-MM-DD)'),
  metrics: statsMetricsSchema.describe('Email metrics for this period')
});

let mapMetrics = (m: any) => ({
  requests: m.requests || 0,
  delivered: m.delivered || 0,
  opens: m.opens || 0,
  uniqueOpens: m.unique_opens || 0,
  clicks: m.clicks || 0,
  uniqueClicks: m.unique_clicks || 0,
  bounces: m.bounces || 0,
  blocks: m.blocks || 0,
  spamReports: m.spam_reports || 0,
  bounceDrops: m.bounce_drops || 0,
  deferred: m.deferred || 0,
  invalid: m.invalid_emails || 0,
  processed: m.processed || 0,
  unsubscribes: m.unsubscribes || 0,
  unsubscribeDrops: m.unsubscribe_drops || 0,
  spamReportDrops: m.spam_report_drops || 0
});

export let getEmailStats = SlateTool.create(spec, {
  name: 'Get Email Stats',
  key: 'get_email_stats',
  description: `Retrieve email delivery and engagement statistics. Returns metrics such as deliveries, opens, clicks, bounces, blocks, and spam reports. Supports global stats or filtering by category.`,
  instructions: [
    'Dates must be in YYYY-MM-DD format.',
    'To get stats for specific email categories, provide category names.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format. Defaults to today.'),
      aggregatedBy: z
        .enum(['day', 'week', 'month'])
        .optional()
        .describe('Aggregation period. Defaults to "day".'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Filter by specific categories. If omitted, returns global stats.')
    })
  )
  .output(
    z.object({
      stats: z.array(statsEntrySchema).describe('Statistics entries grouped by date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let rawStats: any[];
    if (ctx.input.categories && ctx.input.categories.length > 0) {
      rawStats = await client.getCategoryStats({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        categories: ctx.input.categories,
        aggregatedBy: ctx.input.aggregatedBy
      });
    } else {
      rawStats = await client.getGlobalStats({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        aggregatedBy: ctx.input.aggregatedBy
      });
    }

    let stats = (rawStats || []).map((entry: any) => ({
      date: entry.date,
      metrics: mapMetrics(entry.stats?.[0]?.metrics || entry.stats?.metrics || {})
    }));

    return {
      output: { stats },
      message: `Retrieved **${stats.length}** stats entries from ${ctx.input.startDate} to ${ctx.input.endDate || 'today'}${ctx.input.categories ? ` for categories: ${ctx.input.categories.join(', ')}` : ''}.`
    };
  });
