import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { budgetInput, invalid, milliunits, required } from '../lib/validation';
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
      budgetId: budgetInput,
      name: z.string().trim().min(1).max(200).describe('Name for the new account'),
      type: accountTypeEnum.describe('Type of account'),
      balance: milliunits.describe('Starting balance in milliunits (e.g., 10000 = $10.00)')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('ID of the created account'),
      name: z.string().describe('Name of the account'),
      type: z.string().describe('Type of the account'),
      balance: milliunits.describe('Balance in milliunits'),
      onBudget: z.boolean().describe('Whether the account is on-budget')
    })
  )
  .handleInvocation(async ctx => {
    if (
      !['checking', 'savings', 'cash', 'creditCard', 'otherAsset', 'otherLiability'].includes(
        ctx.input.type
      )
    )
      throw invalid(
        'YNAB only supports creating checking, savings, cash, creditCard, otherAsset, or otherLiability accounts through the API. Create other account types in the YNAB app.'
      );
    const account = await new Client({ token: ctx.auth.token }).createAccount(
      ctx.input.budgetId ?? ctx.config.budgetId,
      {
        name: required(ctx.input.name, 'Account name'),
        type: ctx.input.type,
        balance: ctx.input.balance
      }
    );
    return {
      output: {
        accountId: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        onBudget: account.on_budget
      },
      message: `Created account ${account.id} with balance ${account.balance} milliunits. Account creation is retained; the API does not delete accounts.`
    };
  })
  .build();
