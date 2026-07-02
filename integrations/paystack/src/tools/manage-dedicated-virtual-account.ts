import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

export let createDedicatedVirtualAccount = SlateTool.create(spec, {
  name: 'Create Dedicated Virtual Account',
  key: 'create_dedicated_virtual_account',
  description: `Create a dedicated virtual bank account (DVA) for a customer. All bank transfers to this account are automatically recorded as transactions from the customer. Currently only available for Nigeria-based businesses.`,
  constraints: [
    'Only available for Nigeria-based registered businesses.',
    'Default limit of 1,000 dedicated accounts per integration (can be increased on request).'
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
  .output(
    z.object({
      accountName: z.string().describe('Name on the virtual account'),
      accountNumber: z.string().describe('Virtual account number'),
      bankName: z.string().describe('Bank providing the virtual account'),
      bankCode: z.string().describe('Bank code'),
      customerCode: z.string().describe('Associated customer code'),
      dedicatedAccountId: z.number().describe('Dedicated account ID'),
      active: z.boolean().describe('Whether the account is active')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.createDedicatedVirtualAccount({
      customer: ctx.input.customer,
      preferredBank: ctx.input.preferredBank,
      subaccount: ctx.input.subaccount,
      splitCode: ctx.input.splitCode,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      phone: ctx.input.phone
    });

    let dva = result.data;

    return {
      output: {
        accountName: dva.account_name,
        accountNumber: dva.account_number,
        bankName: dva.bank?.name ?? '',
        bankCode: dva.bank?.slug ?? '',
        customerCode: dva.customer?.customer_code ?? ctx.input.customer,
        dedicatedAccountId: dva.id,
        active: dva.active ?? true
      },
      message: `Virtual account created: **${dva.account_name}** - ${dva.account_number} at ${dva.bank?.name ?? 'bank'}.`
    };
  })
  .build();

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
      active: z.boolean().optional().describe('Filter by active status'),
      currency: z.string().optional().describe('Filter by currency'),
      customer: z.string().optional().describe('Filter by customer ID')
    })
  )
  .output(
    z.object({
      accounts: z.array(
        z.object({
          dedicatedAccountId: z.number().describe('Account ID'),
          accountName: z.string().describe('Account name'),
          accountNumber: z.string().describe('Account number'),
          bankName: z.string().describe('Bank name'),
          customerCode: z.string().describe('Customer code'),
          active: z.boolean().describe('Whether active')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listDedicatedVirtualAccounts({
      active: ctx.input.active,
      currency: ctx.input.currency,
      customer: ctx.input.customer
    });

    let accounts = (result.data ?? []).map((a: any) => ({
      dedicatedAccountId: a.id,
      accountName: a.account_name,
      accountNumber: a.account_number,
      bankName: a.bank?.name ?? '',
      customerCode: a.customer?.customer_code ?? '',
      active: a.active ?? true
    }));

    return {
      output: {
        accounts
      },
      message: `Found **${accounts.length}** dedicated virtual accounts.`
    };
  })
  .build();
