import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

let govTradeSchema = z.object({
  tradeId: z.string().optional().describe('Unique trade identifier'),
  transactionDate: z.string().optional().describe('Transaction date'),
  reportDate: z.string().optional().describe('Filing/report date'),
  transactionType: z.string().optional().describe('Sale, Partial Sale, or Purchase'),
  amount: z.string().optional().describe('Dollar range or exact amount'),
  chamber: z.string().optional().describe('House or Senate'),
  filerName: z.string().optional().describe('Name of the congress member'),
  filerState: z.string().optional().describe('State represented'),
  filerDistrict: z.string().optional().describe('Congressional district (House only)'),
  securityName: z.string().optional().describe('Security/asset name'),
  ticker: z.string().optional().describe('Ticker symbol'),
  securityType: z.string().optional().describe('Type of security'),
  ownership: z.string().optional().describe('Ownership designation'),
  created: z.string().optional().describe('Record creation timestamp'),
  updated: z.string().optional().describe('Record last update timestamp')
});

export let getGovernmentTradesTool = SlateTool.create(spec, {
  name: 'Get Government Trades',
  key: 'get_government_trades',
  description: `Retrieve trades made by U.S. Congress members (House and Senate). Includes transaction details, filer information, amounts, and associated securities. Useful for tracking congressional stock trading activity.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z
        .string()
        .optional()
        .describe('Comma-separated ticker symbols to filter (max 50)'),
      chamber: z
        .enum(['House', 'Senate'])
        .optional()
        .describe('Filter by congressional chamber'),
      date: z.string().optional().describe('Specific date (YYYY-MM-DD)'),
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
      page: z.number().optional().default(0).describe('Page offset'),
      pageSize: z.number().optional().default(50).describe('Results per page (max 1000)')
    })
  )
  .output(
    z.object({
      trades: z.array(govTradeSchema).describe('Congressional trade records'),
      count: z.number().describe('Number of trades returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.getGovernmentTrades({
      searchKeys: ctx.input.tickers,
      chamber: ctx.input.chamber,
      date: ctx.input.date,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let items = data?.data || (Array.isArray(data) ? data : []);
    let trades = items.map((item: any) => ({
      tradeId: item.id,
      transactionDate: item.transaction_date,
      reportDate: item.report_date,
      transactionType: item.transaction_type,
      amount: item.amount,
      chamber: item.chamber,
      filerName: item.filer_info?.name || item.filer_info?.name_full,
      filerState: item.filer_info?.state,
      filerDistrict: item.filer_info?.district,
      securityName: item.security?.name,
      ticker: item.security?.ticker,
      securityType: item.security?.type,
      ownership: item.ownership,
      created: item.created,
      updated: item.updated
    }));

    return {
      output: {
        trades,
        count: trades.length
      },
      message: `Found **${trades.length}** government trade(s)${ctx.input.chamber ? ` from the ${ctx.input.chamber}` : ''}${ctx.input.tickers ? ` for: ${ctx.input.tickers}` : ''}.`
    };
  })
  .build();
