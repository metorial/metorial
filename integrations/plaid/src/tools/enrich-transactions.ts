import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let enrichedTransactionSchema = z.object({
  transactionId: z.string().describe('Your original transaction ID'),
  merchantName: z.string().nullable().optional().describe('Identified merchant name'),
  website: z.string().nullable().optional().describe('Merchant website'),
  logoUrl: z.string().nullable().optional().describe('URL to merchant logo'),
  paymentChannel: z
    .string()
    .nullable()
    .optional()
    .describe('Payment channel: in store, online, other'),
  category: z.string().nullable().optional().describe('Primary personal finance category'),
  categoryDetailed: z
    .string()
    .nullable()
    .optional()
    .describe('Detailed personal finance category'),
  categoryConfidence: z
    .string()
    .nullable()
    .optional()
    .describe('Confidence: VERY_HIGH, HIGH, MEDIUM, LOW'),
  counterparties: z
    .array(
      z.object({
        name: z.string().describe('Counterparty name'),
        type: z.string().describe('Type: merchant, financial_institution, payment_app, etc.'),
        website: z.string().nullable().optional(),
        logoUrl: z.string().nullable().optional()
      })
    )
    .optional()
    .describe('Identified counterparties'),
  location: z
    .object({
      city: z.string().nullable().optional(),
      region: z.string().nullable().optional(),
      postalCode: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      storeNumber: z.string().nullable().optional()
    })
    .optional()
    .describe('Enriched location data')
});

export let enrichTransactionsTool = SlateTool.create(spec, {
  name: 'Enrich Transactions',
  key: 'enrich_transactions',
  description: `Enrich non-Plaid transaction data with merchant names, logos, categories, counterparties, and location details. Accepts up to 100 transactions per request. Useful for adding insights to transactions from sources other than Plaid.`,
  constraints: ['Maximum 100 transactions per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountType: z
        .enum(['depository', 'credit'])
        .describe('Type of account the transactions are from'),
      transactions: z
        .array(
          z.object({
            transactionId: z.string().describe('Your unique transaction identifier'),
            description: z.string().describe('Raw transaction description from the bank'),
            amount: z.number().describe('Transaction amount'),
            direction: z.enum(['INFLOW', 'OUTFLOW']).describe('Money direction'),
            isoCurrencyCode: z.string().optional().describe('ISO 4217 currency code'),
            datePosted: z.string().optional().describe('Transaction date (YYYY-MM-DD)')
          })
        )
        .describe('Transactions to enrich')
    })
  )
  .output(
    z.object({
      enrichedTransactions: z.array(enrichedTransactionSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.enrichTransactions(
      ctx.input.accountType,
      ctx.input.transactions.map(t => ({
        id: t.transactionId,
        description: t.description,
        amount: t.amount,
        direction: t.direction,
        isoCurrencyCode: t.isoCurrencyCode,
        datePosted: t.datePosted
      }))
    );

    let enriched = (result.enriched_transactions || []).map((t: any) => ({
      transactionId: t.id,
      merchantName: t.enrichments?.merchant_name ?? null,
      website: t.enrichments?.website ?? null,
      logoUrl: t.enrichments?.logo_url ?? null,
      paymentChannel: t.enrichments?.payment_channel ?? null,
      category: t.enrichments?.personal_finance_category?.primary ?? null,
      categoryDetailed: t.enrichments?.personal_finance_category?.detailed ?? null,
      categoryConfidence: t.enrichments?.personal_finance_category?.confidence_level ?? null,
      counterparties: (t.enrichments?.counterparties || []).map((c: any) => ({
        name: c.name,
        type: c.type,
        website: c.website ?? null,
        logoUrl: c.logo_url ?? null
      })),
      location: t.enrichments?.location
        ? {
            city: t.enrichments.location.city ?? null,
            region: t.enrichments.location.region ?? null,
            postalCode: t.enrichments.location.postal_code ?? null,
            country: t.enrichments.location.country ?? null,
            storeNumber: t.enrichments.location.store_number ?? null
          }
        : undefined
    }));

    return {
      output: { enrichedTransactions: enriched },
      message: `Enriched **${enriched.length}** transaction(s) with merchant and category data.`
    };
  })
  .build();
