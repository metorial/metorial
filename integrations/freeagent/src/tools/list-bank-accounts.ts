import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listBankAccounts = SlateTool.create(spec, {
  name: 'List Bank Accounts',
  key: 'list_bank_accounts',
  description: `Retrieve bank accounts from FreeAgent. Optionally filter by account type (standard, credit card, PayPal).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum(['standard_bank_accounts', 'credit_card_accounts', 'paypal_accounts'])
        .optional()
        .describe('Filter by account type'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      bankAccounts: z
        .array(z.record(z.string(), z.any()))
        .describe('List of bank account records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let bankAccounts = await client.listBankAccounts(ctx.input);
    let count = bankAccounts.length;

    return {
      output: { bankAccounts },
      message: `Found **${count}** bank account${count !== 1 ? 's' : ''}.`
    };
  })
  .build();
