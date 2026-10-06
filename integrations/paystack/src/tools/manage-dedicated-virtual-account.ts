import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import {
  exactId,
  observedFlag,
  optionalNumericId,
  optionalRecord,
  pagination,
  record,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const createDedicatedVirtualAccountOutput = z.object({
  accountName: z.string().describe('Name on the virtual account'),
  accountNumber: z.string().describe('Virtual account number'),
  bankName: z.string().describe('Bank providing the virtual account'),
  bankSlug: z.string().describe('Provider bank slug'),
  bankCode: z
    .string()
    .describe('Legacy field containing the provider bank slug, not a bank routing code'),
  customerCode: z.string().describe('Associated customer code'),
  dedicatedAccountId: z.number().optional().describe('Dedicated account ID'),
  exactDedicatedAccountId: z
    .string()
    .describe(
      'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
    ),
  active: z.boolean().describe('Whether the account is active')
});

export let createDedicatedVirtualAccount = SlateTool.create(spec, {
  name: 'Create Dedicated Virtual Account',
  key: 'create_dedicated_virtual_account',
  description: `Create a dedicated virtual bank account (DVA) for a customer. All bank transfers to this account are automatically recorded as transactions from the customer. Available to eligible Nigerian and Ghanaian merchants; customer and bank eligibility apply.`,
  constraints: [
    'Requires an eligible merchant and customer, supported bank provider, and any required KYC.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customer: z.string().describe('Customer ID or customer code'),
      preferredBank: z
        .string()
        .optional()
        .describe('Preferred bank slug (e.g., wema-bank, titan-paystack)'),
      subaccount: z.string().optional().describe('Subaccount code for split payments'),
      splitCode: z.string().optional().describe('Split code for transaction splits'),
      firstName: z.string().optional().describe('Customer first name override'),
      lastName: z.string().optional().describe('Customer last name override'),
      phone: z.string().optional().describe('Customer phone override')
    })
  )
  .output(createDedicatedVirtualAccountOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.createDedicatedVirtualAccount(ctx.input);
    const account = record(result.data);
    const bank = optionalRecord(account.bank);
    const output = {
      accountName: account.account_name,
      accountNumber: account.account_number,
      bankName: bank.name,
      bankCode: bank.slug,
      bankSlug: bank.slug,
      customerCode: optionalRecord(account.customer).customer_code,
      dedicatedAccountId: optionalNumericId(account.id),
      exactDedicatedAccountId: exactId(account.id),
      active: observedFlag(account.active)
    };
    return {
      output: validateOutput(createDedicatedVirtualAccountOutput, output),
      message:
        'Dedicated account provisioning response received; verify customer binding and active state.'
    };
  })
  .build();
const listDedicatedVirtualAccountsOutput = z.object({
  accounts: z.array(
    z.object({
      dedicatedAccountId: z.number().optional().describe('Account ID'),
      exactDedicatedAccountId: z
        .string()
        .describe(
          'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
        ),
      accountName: z.string().describe('Account name'),
      accountNumber: z.string().describe('Account number'),
      bankName: z.string().describe('Bank name'),
      customerCode: z.string().describe('Customer code'),
      active: z.boolean().describe('Whether active')
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

export let listDedicatedVirtualAccounts = SlateTool.create(spec, {
  name: 'List Dedicated Virtual Accounts',
  key: 'list_dedicated_virtual_accounts',
  description: `Retrieve a list of dedicated virtual accounts on your integration. Filter by active status, currency, provider, or customer.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Offset page number'),
      useCursor: z.boolean().optional().describe('Use cursor pagination; omit page when true'),
      next: z.string().optional().describe('Next cursor from the prior response'),
      previous: z.string().optional().describe('Previous cursor from the prior response'),
      active: z.boolean().optional().describe('Filter by active status'),
      currency: z.string().optional().describe('Filter by currency'),
      customer: z.string().optional().describe('Filter by customer ID')
    })
  )
  .output(listDedicatedVirtualAccountsOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listDedicatedVirtualAccounts(ctx.input);
    const output = {
      accounts: records(result.data).map(item => ({
        dedicatedAccountId: optionalNumericId(item.id),
        exactDedicatedAccountId: exactId(item.id),
        accountName: item.account_name,
        accountNumber: item.account_number,
        bankName: optionalRecord(item.bank).name,
        customerCode: optionalRecord(item.customer).customer_code,
        active: observedFlag(item.active)
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listDedicatedVirtualAccountsOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
