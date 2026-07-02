import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z.object({
  isDeriviative: z.boolean().optional().describe('Whether this is a derivative transaction'),
  acquiredOrDisposed: z.string().optional().describe('Acquired (A) or Disposed (D)'),
  transactionDate: z.string().optional().describe('Date of transaction'),
  shares: z.number().optional().describe('Number of shares'),
  pricePerShare: z.number().optional().describe('Price per share'),
  securityTitle: z.string().optional().describe('Title of security'),
  transactionCode: z.string().optional().describe('Transaction code'),
  postTransactionQuantity: z.number().optional().describe('Shares held after transaction')
});

let filingSchema = z.object({
  filingId: z.string().optional().describe('Unique filing identifier'),
  accessionNumber: z.string().optional().describe('SEC accession number'),
  companySymbol: z.string().optional().describe('Company ticker symbol'),
  companyName: z.string().optional().describe('Company name'),
  companyCik: z.string().optional().describe('Company CIK number'),
  filingDate: z.string().optional().describe('Filing date'),
  formType: z.string().optional().describe('SEC form type'),
  htmlUrl: z.string().optional().describe('Link to SEC filing'),
  insiderName: z.string().optional().describe('Insider name'),
  insiderTitle: z.string().optional().describe('Insider title/position'),
  isDirector: z.boolean().optional().describe('Whether insider is a director'),
  isOfficer: z.boolean().optional().describe('Whether insider is an officer'),
  isTenPercentOwner: z.boolean().optional().describe('Whether insider owns 10%+ of shares'),
  transactions: z
    .array(transactionSchema)
    .optional()
    .describe('Individual transactions in the filing'),
  updated: z.string().optional().describe('Last updated timestamp')
});

export let getInsiderTransactionsTool = SlateTool.create(spec, {
  name: 'Get Insider Transactions',
  key: 'get_insider_transactions',
  description: `Retrieve SEC insider transaction filings (Form 4) for publicly traded companies. Includes transaction details, insider information, and filing data. Useful for monitoring corporate insider buying and selling activity.`,
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
      date: z.string().optional().describe('Specific date (YYYY-MM-DD)'),
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
      page: z.number().optional().default(0).describe('Page offset'),
      pageSize: z.number().optional().default(50).describe('Results per page (max 1000)')
    })
  )
  .output(
    z.object({
      filings: z.array(filingSchema).describe('Insider transaction filings'),
      count: z.number().describe('Number of filings returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.getInsiderTransactions({
      searchKeys: ctx.input.tickers,
      date: ctx.input.date,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let items = data?.data || (Array.isArray(data) ? data : []);
    let filings = items.map((item: any) => ({
      filingId: item.id,
      accessionNumber: item.accession_number,
      companySymbol: item.company_symbol,
      companyName: item.company_name,
      companyCik: item.company_cik,
      filingDate: item.filing_date,
      formType: item.form_type,
      htmlUrl: item.html_url,
      insiderName: item.owner?.insider_name,
      insiderTitle: item.owner?.insider_title,
      isDirector: item.owner?.is_director,
      isOfficer: item.owner?.is_officer,
      isTenPercentOwner: item.owner?.is_ten_percent_owner,
      transactions: (item.transactions || []).map((t: any) => ({
        isDeriviative: t.is_derivative,
        acquiredOrDisposed: t.acquired_or_disposed,
        transactionDate: t.date_transaction,
        shares: t.shares ? Number(t.shares) : undefined,
        pricePerShare: t.price_per_share ? Number(t.price_per_share) : undefined,
        securityTitle: t.security_title,
        transactionCode: t.transaction_code,
        postTransactionQuantity: t.post_transaction_quantity
          ? Number(t.post_transaction_quantity)
          : undefined
      })),
      updated: item.updated
    }));

    return {
      output: {
        filings,
        count: filings.length
      },
      message: `Found **${filings.length}** insider transaction filing(s)${ctx.input.tickers ? ` for: ${ctx.input.tickers}` : ''}.`
    };
  })
  .build();
