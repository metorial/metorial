import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

export let earningsEvent = SlateTrigger.create(spec, {
  name: 'Earnings Event',
  key: 'earnings_event',
  description:
    'Triggers when new earnings reports appear on the financial calendar. Polls the earnings calendar for upcoming and recent earnings announcements.'
})
  .input(
    z.object({
      earningsCode: z.string().describe('Ticker symbol'),
      reportDate: z.string().optional().nullable().describe('Report date'),
      earningsDate: z.string().optional().nullable().describe('Earnings date'),
      beforeAfterMarket: z.string().optional().nullable().describe('Before or after market'),
      currency: z.string().optional().nullable().describe('Currency'),
      actual: z.number().optional().nullable().describe('Actual EPS'),
      estimate: z.number().optional().nullable().describe('Estimated EPS'),
      difference: z.number().optional().nullable().describe('EPS difference'),
      percent: z.number().optional().nullable().describe('EPS difference percentage')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Ticker symbol'),
      reportDate: z.string().optional().nullable().describe('Earnings report date'),
      earningsDate: z.string().optional().nullable().describe('Earnings date'),
      beforeAfterMarket: z
        .string()
        .optional()
        .nullable()
        .describe('Whether reported before or after market hours'),
      currency: z.string().optional().nullable().describe('Currency of the earnings'),
      actualEps: z.number().optional().nullable().describe('Actual earnings per share'),
      estimatedEps: z.number().optional().nullable().describe('Estimated earnings per share'),
      epsDifference: z
        .number()
        .optional()
        .nullable()
        .describe('Difference between actual and estimated EPS'),
      epsDifferencePercent: z
        .number()
        .optional()
        .nullable()
        .describe('Percentage difference from estimate')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new EodhdClient({ token: ctx.auth.token });

      let lastSeenIds = (ctx.state as { seenIds?: string[] })?.seenIds || [];

      let today = new Date().toISOString().split('T')[0]!;
      let nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!;

      let result = await client.getEarningsCalendar({
        from: today,
        to: nextWeek
      });

      let earnings: Array<{
        code: string;
        report_date?: string | null;
        date?: string | null;
        before_after_market?: string | null;
        currency?: string | null;
        actual?: number | null;
        estimate?: number | null;
        difference?: number | null;
        percent?: number | null;
      }> = result?.earnings ?? (Array.isArray(result) ? result : []);

      let newEarnings = earnings.filter(e => {
        let earningId = `${e.code}-${e.report_date || e.date}`;
        return !lastSeenIds.includes(earningId);
      });

      let updatedSeenIds = [
        ...lastSeenIds,
        ...newEarnings.map(e => `${e.code}-${e.report_date || e.date}`)
      ].slice(-500);

      return {
        inputs: newEarnings.map(e => ({
          earningsCode: e.code,
          reportDate: e.report_date,
          earningsDate: e.date,
          beforeAfterMarket: e.before_after_market,
          currency: e.currency,
          actual: e.actual,
          estimate: e.estimate,
          difference: e.difference,
          percent: e.percent
        })),
        updatedState: {
          seenIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'earnings.announced',
        id: `${ctx.input.earningsCode}-${ctx.input.reportDate || ctx.input.earningsDate}`,
        output: {
          ticker: ctx.input.earningsCode,
          reportDate: ctx.input.reportDate,
          earningsDate: ctx.input.earningsDate,
          beforeAfterMarket: ctx.input.beforeAfterMarket,
          currency: ctx.input.currency,
          actualEps: ctx.input.actual,
          estimatedEps: ctx.input.estimate,
          epsDifference: ctx.input.difference,
          epsDifferencePercent: ctx.input.percent
        }
      };
    }
  })
  .build();
