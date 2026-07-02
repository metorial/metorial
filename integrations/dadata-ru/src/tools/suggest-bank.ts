import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

let bankSuggestionSchema = z.object({
  value: z.string().describe('Bank name'),
  bic: z.string().nullable().describe('BIK (bank identification code)'),
  swift: z.string().nullable().describe('SWIFT code'),
  inn: z.string().nullable().describe('INN'),
  kpp: z.string().nullable().describe('KPP'),
  registrationNumber: z.string().nullable().describe('Bank of Russia registration number'),
  correspondentAccount: z.string().nullable().describe('Correspondent account'),
  paymentCity: z.string().nullable().describe('Payment city'),
  namePayment: z.string().nullable().describe('Payment name'),
  nameFull: z.string().nullable().describe('Full bank name'),
  nameShort: z.string().nullable().describe('Short bank name'),
  bankType: z.string().nullable().describe('Type: BANK, NKO, BANK_BRANCH, NKO_BRANCH, CBR'),
  status: z.string().nullable().describe('Status: ACTIVE, LIQUIDATING, LIQUIDATED'),
  address: z.string().nullable().describe('Bank address')
});

export let suggestBank = SlateTool.create(spec, {
  name: 'Suggest Bank',
  key: 'suggest_bank',
  description: `Provides autocomplete suggestions for Russian banks. Search by BIK, SWIFT, INN, bank name, or address.
Returns bank details including BIK, SWIFT, correspondent account, registration number, and status.`,
  instructions: [
    'Search by BIK, SWIFT code, INN, bank name, or address.',
    'Use status to filter by active or liquidated banks.',
    'Use bankType to filter by institution type (BANK, NKO, BANK_BRANCH, etc.).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('BIK, SWIFT, INN, bank name, or address'),
      count: z.number().optional().describe('Number of results (max 20, default 10)'),
      status: z
        .array(z.enum(['ACTIVE', 'LIQUIDATING', 'LIQUIDATED']))
        .optional()
        .describe('Filter by bank status'),
      bankType: z
        .array(z.enum(['BANK', 'NKO', 'BANK_BRANCH', 'NKO_BRANCH', 'CBR']))
        .optional()
        .describe('Filter by institution type'),
      locations: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Region constraints'),
      locationsBoost: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Boost priority for specific regions')
    })
  )
  .output(
    z.object({
      suggestions: z.array(bankSuggestionSchema).describe('List of bank suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.suggestBank({
      query: ctx.input.query,
      count: ctx.input.count,
      status: ctx.input.status,
      type: ctx.input.bankType,
      locations: ctx.input.locations,
      locationsBoost: ctx.input.locationsBoost
    });

    let suggestions = (data.suggestions || []).map((s: any) => ({
      value: s.value || '',
      bic: s.data?.bic ?? null,
      swift: s.data?.swift ?? null,
      inn: s.data?.inn ?? null,
      kpp: s.data?.kpp ?? null,
      registrationNumber: s.data?.registration_number ?? null,
      correspondentAccount: s.data?.correspondent_account ?? null,
      paymentCity: s.data?.payment_city ?? null,
      namePayment: s.data?.name?.payment ?? null,
      nameFull: s.data?.name?.full ?? null,
      nameShort: s.data?.name?.short ?? null,
      bankType: s.data?.opf?.type ?? null,
      status: s.data?.state?.status ?? null,
      address: s.data?.address?.value ?? null
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** bank suggestion(s) for "${ctx.input.query}".`
    };
  })
  .build();
