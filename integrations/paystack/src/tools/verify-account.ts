import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import {
  exactId,
  observedFlag,
  optionalNumericId,
  pagination,
  record,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const verifyBankAccountOutput = z.object({
  accountNumber: z.string().describe('Verified account number'),
  accountName: z.string().describe('Name on the bank account'),
  bankId: z.number().optional().describe('Bank ID'),
  exactBankId: z.string().optional().describe('Exact bank ID when returned')
});

export let verifyBankAccount = SlateTool.create(spec, {
  name: 'Verify Bank Account',
  key: 'verify_bank_account',
  description: `Resolve and verify a bank account number. Returns the account name for confirmation before creating a transfer recipient. Use the List Banks tool to get the bank code.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountNumber: z.string().describe('Bank account number to verify'),
      bankCode: z.string().describe('Bank code (use List Banks tool to find this)')
    })
  )
  .output(verifyBankAccountOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.resolveAccountNumber(ctx.input);
    const account = record(result.data);
    const output = {
      accountNumber: account.account_number,
      accountName: account.account_name,
      bankId: account.bank_id === undefined ? undefined : optionalNumericId(account.bank_id),
      exactBankId: account.bank_id === undefined ? undefined : exactId(account.bank_id)
    };
    return {
      output: validateOutput(verifyBankAccountOutput, output),
      message:
        'Account number resolved; this is not proof of ownership or transfer authorization.'
    };
  })
  .build();
const listBanksOutput = z.object({
  banks: z.array(
    z.object({
      bankName: z.string().describe('Bank name'),
      bankCode: z.string().describe('Bank code for API operations'),
      bankSlug: z.string().nullable().describe('Bank slug'),
      country: z.string().describe('Country'),
      currency: z.string().describe('Currency'),
      type: z.string().describe('Bank type'),
      active: z.boolean().describe('Whether the bank is active')
    })
  ),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size'),
  totalCount: z.number().optional(),
  currentPage: z.number().optional(),
  totalPages: z.number().optional()
});

export let listBanks = SlateTool.create(spec, {
  name: 'List Banks',
  key: 'list_banks',
  description: `Retrieve the list of supported banks and their codes. Use this to find the bank code needed for verifying accounts and creating transfer recipients.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      country: z
        .string()
        .optional()
        .describe('Country code (e.g., nigeria, ghana, south-africa, kenya)'),
      currency: z
        .string()
        .optional()
        .describe('Filter by currency (e.g., NGN, GHS, ZAR, KES)'),
      type: z
        .string()
        .optional()
        .describe('Filter by bank type (e.g., nuban, mobile_money, ghipss)'),
      perPage: z.number().optional().describe('Records per page (default 50, maximum 100)'),
      useCursor: z.boolean().optional().describe('Use cursor pagination'),
      next: z.string().optional().describe('Next cursor from the prior response'),
      previous: z.string().optional().describe('Previous cursor from the prior response')
    })
  )
  .output(listBanksOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listBanks(ctx.input);
    const output = {
      banks: records(result.data).map(item => ({
        bankName: item.name,
        bankCode: item.code,
        bankSlug: item.slug ?? null,
        country: item.country,
        currency: item.currency,
        type: item.type,
        active: observedFlag(item.active)
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listBanksOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
const resolveCardBinOutput = z.object({
  bin: z.string().describe('Card BIN'),
  brand: z.string().describe('Card brand (e.g., visa, mastercard)'),
  cardType: z.string().describe('Card type (e.g., debit, credit)'),
  bank: z.string().describe('Issuing bank name'),
  countryCode: z.string().describe('Country code'),
  countryName: z.string().describe('Country name')
});

export let resolveCardBin = SlateTool.create(spec, {
  name: 'Resolve Card BIN',
  key: 'resolve_card_bin',
  description: `Look up card details using the first 6 digits (BIN) of a card number. Returns the card brand, type, issuing bank, and country.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bin: z.string().describe('First 6 digits of the card number')
    })
  )
  .output(resolveCardBinOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.resolveBin(ctx.input.bin);
    const card = record(result.data);
    const output = {
      bin: card.bin,
      brand: card.brand,
      cardType: card.card_type,
      bank: card.bank,
      countryCode: card.country_code,
      countryName: card.country_name
    };
    return {
      output: validateOutput(resolveCardBinOutput, output),
      message: 'Card BIN details retrieved.'
    };
  })
  .build();
