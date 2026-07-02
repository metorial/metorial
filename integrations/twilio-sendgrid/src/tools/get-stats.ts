import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let statsMetricsSchema = z.object({
  requests: z.number().describe('Number of emails requested to be delivered'),
  delivered: z.number().describe('Number of emails successfully delivered'),
  opens: z.number().describe('Number of times emails were opened'),
  uniqueOpens: z.number().describe('Number of unique recipients who opened'),
  clicks: z.number().describe('Number of times links were clicked'),
  uniqueClicks: z.number().describe('Number of unique recipients who clicked'),
  bounces: z.number().describe('Number of bounced emails'),
  spamReports: z.number().describe('Number of spam reports'),
  blocks: z.number().describe('Number of blocked emails'),
  deferred: z.number().describe('Number of deferred emails'),
  unsubscribes: z.number().describe('Number of unsubscribes'),
  processed: z.number().describe('Number of processed emails'),
  invalidEmails: z.number().describe('Number of invalid email addresses'),
  drops: z.number().describe('Number of dropped emails')
});

let mapStats = (metrics: any) => ({
  requests: metrics.requests || 0,
  delivered: metrics.delivered || 0,
  opens: metrics.opens || 0,
  uniqueOpens: metrics.unique_opens || 0,
  clicks: metrics.clicks || 0,
  uniqueClicks: metrics.unique_clicks || 0,
  bounces: metrics.bounces || 0,
  spamReports: metrics.spam_reports || 0,
  blocks: metrics.blocks || 0,
  deferred: metrics.deferred || 0,
  unsubscribes: metrics.unsubscribes || 0,
  processed: metrics.processed || 0,
  invalidEmails: metrics.invalid_emails || 0,
  drops: metrics.drops || 0
});

export let getStats = SlateTool.create(spec, {
  name: 'Get Email Statistics',
  key: 'get_stats',
  description: `Retrieve email sending statistics for your SendGrid account. Get global stats or filter by categories. Data includes delivery rates, engagement metrics (opens, clicks), bounces, and more. Useful for monitoring email performance and deliverability.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      aggregatedBy: z
        .enum(['day', 'week', 'month'])
        .optional()
        .describe('Time period to aggregate stats by'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Filter stats by categories. If omitted, returns global stats.')
    })
  )
  .output(
    z.object({
      stats: z
        .array(
          z.object({
            date: z.string().describe('Date for this stats entry'),
            name: z.string().optional().describe('Category name (for category stats)'),
            metrics: statsMetricsSchema
          })
        )
        .describe('Statistics entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let rawStats: any[];
    if (ctx.input.categories && ctx.input.categories.length > 0) {
      rawStats = await client.getCategoryStats(
        ctx.input.categories,
        ctx.input.startDate,
        ctx.input.endDate,
        ctx.input.aggregatedBy
      );
    } else {
      rawStats = await client.getGlobalStats(
        ctx.input.startDate,
        ctx.input.endDate,
        ctx.input.aggregatedBy
      );
    }

    let stats = (rawStats || []).flatMap((entry: any) =>
      (entry.stats || []).map((s: any) => ({
        date: entry.date,
        name: s.name || undefined,
        metrics: mapStats(s.metrics || {})
      }))
    );

    return {
      output: { stats },
      message: `Retrieved **${stats.length}** stats entries from ${ctx.input.startDate}${ctx.input.endDate ? ` to ${ctx.input.endDate}` : ''}.`
    };
  })
  .build();
