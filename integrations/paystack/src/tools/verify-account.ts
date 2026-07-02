import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
      accountNumber: z.string().describe('Verified account number'),
      accountName: z.string().describe('Name on the bank account'),
      bankId: z.number().describe('Bank ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.resolveAccountNumber({
      accountNumber: ctx.input.accountNumber,
      bankCode: ctx.input.bankCode
    });

    let account = result.data;

    return {
      output: {
        accountNumber: account.account_number,
        accountName: account.account_name,
        bankId: account.bank_id
      },
      message: `Account verified: **${account.account_name}** (${account.account_number})`
    };
  })
  .build();

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
      perPage: z.number().optional().describe('Records per page (default 50)')
    })
  )
  .output(
    z.object({
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
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listBanks({
      country: ctx.input.country,
      currency: ctx.input.currency,
      type: ctx.input.type,
      perPage: ctx.input.perPage
    });

    let banks = (result.data ?? []).map((b: any) => ({
      bankName: b.name,
      bankCode: b.code,
      bankSlug: b.slug ?? null,
      country: b.country ?? '',
      currency: b.currency ?? '',
      type: b.type ?? '',
      active: b.active ?? true
    }));

    return {
      output: {
        banks
      },
      message: `Found **${banks.length}** banks.`
    };
  })
  .build();

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
  .output(
    z.object({
      bin: z.string().describe('Card BIN'),
      brand: z.string().describe('Card brand (e.g., visa, mastercard)'),
      cardType: z.string().describe('Card type (e.g., debit, credit)'),
      bank: z.string().describe('Issuing bank name'),
      countryCode: z.string().describe('Country code'),
      countryName: z.string().describe('Country name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.resolveBin(ctx.input.bin);
    let card = result.data;

    return {
      output: {
        bin: card.bin,
        brand: card.brand,
        cardType: card.card_type,
        bank: card.bank,
        countryCode: card.country_code,
        countryName: card.country_name
      },
      message: `Card BIN **${card.bin}**: ${card.brand} ${card.card_type} by ${card.bank} (${card.country_name})`
    };
  })
  .build();
