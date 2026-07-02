import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bankAccountOutputSchema = z.object({
  bankAccountId: z.string().describe('Unique bank account ID'),
  routingNumber: z.string().describe('Bank routing number'),
  accountNumber: z.string().describe('Bank account number (masked)'),
  accountType: z.string().describe('Account type: individual or company'),
  signatory: z.string().describe('Signatory name'),
  verified: z.boolean().describe('Whether the bank account has been verified'),
  description: z.string().optional().nullable().describe('Description'),
  metadata: z.record(z.string(), z.string()).optional().nullable().describe('Metadata'),
  dateCreated: z.string().optional().nullable().describe('Creation date'),
  dateModified: z.string().optional().nullable().describe('Last modification date')
});

let mapBankAccount = (data: any) => ({
  bankAccountId: data.id,
  routingNumber: data.routing_number,
  accountNumber: data.account_number,
  accountType: data.account_type,
  signatory: data.signatory,
  verified: data.verified ?? false,
  description: data.description ?? null,
  metadata: data.metadata ?? null,
  dateCreated: data.date_created ?? null,
  dateModified: data.date_modified ?? null
});

export let createBankAccount = SlateTool.create(spec, {
  name: 'Create Bank Account',
  key: 'create_bank_account',
  description: `Create a new bank account for sending checks. After creation, the account must be verified via micro-deposits before it can be used.`,
  instructions: [
    'After creating, Lob will send two micro-deposits. Use "Verify Bank Account" with those amounts to complete verification.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      routingNumber: z.string().describe('9-digit bank routing number'),
      accountNumber: z.string().describe('Bank account number'),
      accountType: z.enum(['individual', 'company']).describe('Account type'),
      signatory: z.string().describe('Name of the account signatory'),
      description: z.string().optional().describe('Internal description'),
      metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata')
    })
  )
  .output(bankAccountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createBankAccount(ctx.input);
    let mapped = mapBankAccount(result);
    return {
      output: mapped,
      message: `Created bank account **${mapped.bankAccountId}** (${mapped.accountType}). Awaiting micro-deposit verification.`
    };
  });

export let verifyBankAccount = SlateTool.create(spec, {
  name: 'Verify Bank Account',
  key: 'verify_bank_account',
  description: `Verify a bank account using the two micro-deposit amounts sent by Lob. Both amounts must match exactly.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      bankAccountId: z
        .string()
        .describe('The bank account ID to verify (starts with "bank_")'),
      amount1: z.number().describe('First micro-deposit amount in cents (e.g., 23 for $0.23)'),
      amount2: z.number().describe('Second micro-deposit amount in cents')
    })
  )
  .output(bankAccountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifyBankAccount(ctx.input.bankAccountId, [
      ctx.input.amount1,
      ctx.input.amount2
    ]);
    let mapped = mapBankAccount(result);
    return {
      output: mapped,
      message: `Bank account **${mapped.bankAccountId}** verified: **${mapped.verified}**`
    };
  });

export let getBankAccount = SlateTool.create(spec, {
  name: 'Get Bank Account',
  key: 'get_bank_account',
  description: `Retrieve details of a specific bank account including its verification status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      bankAccountId: z.string().describe('The bank account ID (starts with "bank_")')
    })
  )
  .output(bankAccountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBankAccount(ctx.input.bankAccountId);
    return {
      output: mapBankAccount(result),
      message: `Bank account **${result.id}** — verified: **${result.verified ?? false}**`
    };
  });

export let listBankAccounts = SlateTool.create(spec, {
  name: 'List Bank Accounts',
  key: 'list_bank_accounts',
  description: `List bank accounts with optional filtering. Returns both verified and unverified accounts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of accounts to return (max 100, default 10)'),
      offset: z.number().optional().describe('Number of accounts to skip')
    })
  )
  .output(
    z.object({
      bankAccounts: z.array(bankAccountOutputSchema),
      totalCount: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listBankAccounts({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let bankAccounts = (result.data || []).map(mapBankAccount);
    return {
      output: {
        bankAccounts,
        totalCount: result.total_count ?? result.count ?? bankAccounts.length
      },
      message: `Found **${bankAccounts.length}** bank accounts`
    };
  });

export let deleteBankAccount = SlateTool.create(spec, {
  name: 'Delete Bank Account',
  key: 'delete_bank_account',
  description: `Permanently delete a bank account. Once deleted, it cannot be used for sending checks.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      bankAccountId: z.string().describe('The bank account ID to delete')
    })
  )
  .output(
    z.object({
      bankAccountId: z.string().describe('ID of the deleted bank account'),
      deleted: z.boolean().describe('Whether it was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteBankAccount(ctx.input.bankAccountId);
    return {
      output: {
        bankAccountId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Deleted bank account **${ctx.input.bankAccountId}**`
    };
  });
