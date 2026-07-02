import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDividendsAndSplits = SlateTool.create(spec, {
  name: 'Get Dividends & Splits',
  key: 'get_dividends_and_splits',
  description: `Retrieve the dividend payment history and/or stock split history for a US-listed company. Use this to analyze payout patterns, dividend growth, and corporate actions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol, e.g. "AAPL"'),
      dataType: z
        .enum(['dividends', 'splits', 'both'])
        .optional()
        .default('both')
        .describe('Which corporate action data to retrieve')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      dividends: z
        .array(
          z.object({
            exDividendDate: z.string().describe('Ex-dividend date'),
            declarationDate: z.string().describe('Declaration date'),
            recordDate: z.string().describe('Record date'),
            paymentDate: z.string().describe('Payment date'),
            amount: z.string().describe('Dividend amount per share')
          })
        )
        .optional()
        .describe('Dividend history'),
      splits: z
        .array(
          z.object({
            effectiveDate: z.string().describe('Date of the stock split'),
            splitRatio: z.string().describe('Split ratio, e.g. "4:1"')
          })
        )
        .optional()
        .describe('Stock split history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { symbol, dataType } = ctx.input;
    let dividends: any[] | undefined;
    let splits: any[] | undefined;

    if (dataType === 'dividends' || dataType === 'both') {
      let divData = await client.dividends({ symbol });
      let rawDividends: any[] = divData.data || [];
      dividends = rawDividends.map((d: any) => ({
        exDividendDate: d.ex_dividend_date || '',
        declarationDate: d.declaration_date || '',
        recordDate: d.record_date || '',
        paymentDate: d.payment_date || '',
        amount: d.amount || ''
      }));
    }

    if (dataType === 'splits' || dataType === 'both') {
      let splitData = await client.splits({ symbol });
      let rawSplits: any[] = splitData.data || [];
      splits = rawSplits.map((s: any) => ({
        effectiveDate: s.effective_date || '',
        splitRatio: s.split_ratio || ''
      }));
    }

    let parts: string[] = [];
    if (dividends) parts.push(`${dividends.length} dividend(s)`);
    if (splits) parts.push(`${splits.length} split(s)`);

    return {
      output: { symbol, dividends, splits },
      message: `Retrieved ${parts.join(' and ')} for **${symbol}**.`
    };
  })
  .build();
