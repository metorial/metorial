import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let holdingSchema = z.object({
  accountId: z.string().describe('Investment account ID'),
  securityId: z.string().describe('Plaid security identifier'),
  quantity: z.number().describe('Number of units held'),
  institutionPrice: z.number().describe('Price per unit as reported by institution'),
  institutionPriceAsOf: z
    .string()
    .nullable()
    .optional()
    .describe('Date of the price (YYYY-MM-DD)'),
  institutionValue: z.number().describe('Total value of the holding'),
  costBasis: z.number().nullable().optional().describe('Original cost basis'),
  isoCurrencyCode: z.string().nullable().optional().describe('ISO 4217 currency code')
});

let securitySchema = z.object({
  securityId: z.string().describe('Plaid security identifier'),
  name: z.string().nullable().optional().describe('Security name'),
  tickerSymbol: z.string().nullable().optional().describe('Ticker symbol'),
  type: z
    .string()
    .nullable()
    .optional()
    .describe('Security type: equity, etf, mutual fund, etc.'),
  closePrice: z.number().nullable().optional().describe('Latest closing price'),
  closePriceAsOf: z.string().nullable().optional().describe('Date of close price'),
  isoCurrencyCode: z.string().nullable().optional().describe('ISO 4217 currency code'),
  isin: z.string().nullable().optional().describe('ISIN identifier'),
  cusip: z.string().nullable().optional().describe('CUSIP identifier')
});

export let getHoldingsTool = SlateTool.create(spec, {
  name: 'Get Investment Holdings',
  key: 'get_holdings',
  description: `Retrieve current investment holdings and security details from brokerage or retirement accounts. Returns positions with quantities, prices, values, and cost basis, along with detailed security metadata (ticker, ISIN, CUSIP, type).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accessToken: z.string().describe('Access token for the Plaid Item'),
      accountIds: z
        .array(z.string())
        .optional()
        .describe('Specific investment account IDs to retrieve')
    })
  )
  .output(
    z.object({
      holdings: z.array(holdingSchema),
      securities: z.array(securitySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getHoldings(ctx.input.accessToken, ctx.input.accountIds);

    let holdings = (result.holdings || []).map((h: any) => ({
      accountId: h.account_id,
      securityId: h.security_id,
      quantity: h.quantity,
      institutionPrice: h.institution_price,
      institutionPriceAsOf: h.institution_price_as_of ?? null,
      institutionValue: h.institution_value,
      costBasis: h.cost_basis ?? null,
      isoCurrencyCode: h.iso_currency_code ?? null
    }));

    let securities = (result.securities || []).map((s: any) => ({
      securityId: s.security_id,
      name: s.name ?? null,
      tickerSymbol: s.ticker_symbol ?? null,
      type: s.type ?? null,
      closePrice: s.close_price ?? null,
      closePriceAsOf: s.close_price_as_of ?? null,
      isoCurrencyCode: s.iso_currency_code ?? null,
      isin: s.isin ?? null,
      cusip: s.cusip ?? null
    }));

    return {
      output: { holdings, securities },
      message: `Retrieved **${holdings.length}** holding(s) across **${securities.length}** securities.`
    };
  })
  .build();
