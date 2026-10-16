import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRows, responseText } from '../lib/response';
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
            splitRatio: z
              .string()
              .describe('Split ratio or factor exactly as returned by the provider')
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
      let rawDividends: any[] = responseRows(divData.data, 'data');
      dividends = rawDividends.map((d: any) => ({
        exDividendDate: responseText(d.ex_dividend_date, 'ex_dividend_date'),
        declarationDate: responseText(d.declaration_date, 'declaration_date'),
        recordDate: responseText(d.record_date, 'record_date'),
        paymentDate: responseText(d.payment_date, 'payment_date'),
        amount: responseText(d.amount, 'amount')
      }));
    }

    if (dataType === 'splits' || dataType === 'both') {
      let splitData = await client.splits({ symbol });
      let rawSplits: any[] = responseRows(splitData.data, 'data');
      splits = rawSplits.map((s: any) => ({
        effectiveDate: responseText(s.effective_date, 'effective_date'),
        splitRatio: responseText(s.split_ratio ?? s.split_factor, 'split ratio or factor')
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
