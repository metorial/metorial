import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let accountTypeEnum = z.enum([
  'checking',
  'savings',
  'cash',
  'creditCard',
  'lineOfCredit',
  'otherAsset',
  'otherLiability',
  'mortgage',
  'autoLoan',
  'studentLoan',
  'personalLoan',
  'medicalDebt',
  'otherDebt'
]);

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  description: `Create a new financial account in a budget. Specify the account name, type, and starting balance. The balance is in milliunits (e.g., $100.00 = 100000).`,
  constraints: [
    'Balance is in milliunits: multiply dollar amount by 1000 (e.g., $10.00 = 10000)'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      budgetId: z
        .string()
        .optional()
        .describe('Budget ID. Defaults to the configured budget.'),
      name: z.string().describe('Name for the new account'),
      type: accountTypeEnum.describe('Type of account'),
      balance: z.number().describe('Starting balance in milliunits (e.g., 10000 = $10.00)')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('ID of the created account'),
      name: z.string().describe('Name of the account'),
      type: z.string().describe('Type of the account'),
      balance: z.number().describe('Balance in milliunits'),
      onBudget: z.boolean().describe('Whether the account is on-budget')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let account = await client.createAccount(budgetId, {
      name: ctx.input.name,
      type: ctx.input.type,
      balance: ctx.input.balance
    });

    return {
      output: {
        accountId: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        onBudget: account.on_budget
      },
      message: `Created **${account.name}** (${account.type}) with balance ${account.balance / 1000} in milliunits`
    };
  })
  .build();
