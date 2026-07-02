import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

let bankDetailSchema = z.object({
  value: z.string().describe('Bank name'),
  bic: z.string().nullable().describe('BIK'),
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

export let lookupBank = SlateTool.create(spec, {
  name: 'Lookup Bank',
  key: 'lookup_bank',
  description: `Looks up a bank by BIK, SWIFT code, INN, INN+KPP (for branches), or Bank of Russia registration number.
Returns full bank details including correspondent account, address, and status. Use this for precise lookups when you have a specific identifier.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('BIK, SWIFT code, INN, INN+KPP, or registration number'),
      kpp: z
        .string()
        .optional()
        .describe('KPP to find a specific branch when searching by INN')
    })
  )
  .output(
    z.object({
      banks: z.array(bankDetailSchema).describe('List of matched banks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.findById('bank', {
      query: ctx.input.query,
      kpp: ctx.input.kpp
    });

    let banks = (data.suggestions || []).map((s: any) => ({
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
      output: { banks },
      message:
        banks.length > 0
          ? `Found **${banks.length}** bank(s) for "${ctx.input.query}": ${banks.map((b: any) => b.value).join(', ')}`
          : `No banks found for "${ctx.input.query}".`
    };
  })
  .build();
