import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let earningsEntrySchema = z.object({
  fiscalDateEnding: z.string().describe('End date of the fiscal period'),
  reportedDate: z.string().describe('Date when earnings were reported'),
  reportedEPS: z.string().describe('Reported earnings per share'),
  estimatedEPS: z.string().describe('Estimated earnings per share (consensus)'),
  surprise: z.string().describe('Earnings surprise amount'),
  surprisePercentage: z.string().describe('Earnings surprise as a percentage')
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
      earnings: z.array(earningsEntrySchema).describe('Earnings data, most recent first')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.earnings({ symbol: ctx.input.symbol });

    let reportsKey = ctx.input.period === 'annual' ? 'annualEarnings' : 'quarterlyEarnings';
    let rawEarnings: any[] = data[reportsKey] || [];

    let earnings = rawEarnings.map((e: any) => ({
      fiscalDateEnding: e.fiscalDateEnding || '',
      reportedDate: e.reportedDate || '',
      reportedEPS: e.reportedEPS || '',
      estimatedEPS: e.estimatedEPS || '',
      surprise: e.surprise || '',
      surprisePercentage: e.surprisePercentage || ''
    }));

    return {
      output: {
        symbol: ctx.input.symbol,
        earnings
      },
      message: `Retrieved ${earnings.length} ${ctx.input.period} earnings report(s) for **${ctx.input.symbol}**.`
    };
  })
  .build();
