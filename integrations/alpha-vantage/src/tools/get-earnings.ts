import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRows, responseText } from '../lib/response';
import { spec } from '../spec';

let earningsEntrySchema = z.object({
  fiscalDateEnding: z.string().describe('End date of the fiscal period'),
  reportedDate: z.string().describe('Date when earnings were reported'),
  reportedEPS: z.string().describe('Reported earnings per share'),
  estimatedEPS: z.string().optional().describe('Estimated earnings per share (consensus)'),
  surprise: z.string().optional().describe('Earnings surprise amount'),
  surprisePercentage: z.string().optional().describe('Earnings surprise as a percentage')
});

export let getEarnings = SlateTool.create(spec, {
  name: 'Get Earnings',
  key: 'get_earnings',
  description: `Retrieve earnings data for a US-listed company, including reported EPS vs. analyst estimates and surprise metrics. Available in both annual and quarterly granularity. Useful for tracking earnings beats/misses and historical earnings trends.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol, e.g. "AAPL"'),
      period: z
        .enum(['annual', 'quarterly'])
        .optional()
        .default('quarterly')
        .describe('Reporting period granularity')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      earnings: z
        .array(earningsEntrySchema)
        .describe(
          'Earnings data, most recent first. Analyst estimates and surprise metrics are omitted from annual records when the provider does not return them.'
        ),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.earnings({ symbol: ctx.input.symbol });

    let reportsKey = ctx.input.period === 'annual' ? 'annualEarnings' : 'quarterlyEarnings';
    let rawEarnings: any[] = responseRows(data[reportsKey], 'data[reportsKey]');

    let earnings = rawEarnings.map((e: any) => ({
      fiscalDateEnding: responseText(e.fiscalDateEnding, 'fiscalDateEnding'),
      reportedDate: responseText(e.reportedDate, 'reportedDate'),
      reportedEPS: responseText(e.reportedEPS, 'reportedEPS'),
      estimatedEPS:
        ctx.input.period === 'annual' && e.estimatedEPS === undefined
          ? undefined
          : responseText(e.estimatedEPS, 'estimatedEPS'),
      surprise:
        ctx.input.period === 'annual' && e.surprise === undefined
          ? undefined
          : responseText(e.surprise, 'surprise'),
      surprisePercentage:
        ctx.input.period === 'annual' && e.surprisePercentage === undefined
          ? undefined
          : responseText(e.surprisePercentage, 'surprisePercentage')
    }));

    return {
      output: {
        symbol: ctx.input.symbol,
        earnings,
        raw: data
      },
      message: `Retrieved ${earnings.length} ${ctx.input.period} earnings report(s) for **${ctx.input.symbol}**.`
    };
  })
  .build();
