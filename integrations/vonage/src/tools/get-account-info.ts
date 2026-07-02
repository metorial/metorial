import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve Vonage account information including current balance, auto-reload status, and subaccount details.
Can also create subaccounts and transfer credit or balance between accounts.`,
  instructions: [
    'Use action "balance" to check account balance.',
    'Use action "list_subaccounts" to see all subaccounts.',
    'Use action "create_subaccount" to create a new subaccount.',
    'Use action "transfer_credit" or "transfer_balance" to move funds between accounts.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'balance',
          'list_subaccounts',
          'create_subaccount',
          'transfer_credit',
          'transfer_balance'
        ])
        .describe('Action to perform'),
      subaccountName: z
        .string()
        .optional()
        .describe('Name for a new subaccount (required for create_subaccount)'),
      usePrimaryAccountBalance: z
        .boolean()
        .optional()
        .describe('Whether the subaccount uses the primary account balance'),
      fromAccountApiKey: z
        .string()
        .optional()
        .describe('Source account API key (for transfers)'),
      toAccountApiKey: z
        .string()
        .optional()
        .describe('Destination account API key (for transfers)'),
      amount: z.number().optional().describe('Amount to transfer (for transfers)'),
      reference: z.string().optional().describe('Reference note for the transfer')
    })
  )
  .output(
    z.object({
      balance: z.number().optional().describe('Account balance in EUR'),
      autoReload: z.boolean().optional().describe('Whether auto-reload is enabled'),
      primaryAccount: z.unknown().optional().describe('Primary account details'),
      subaccounts: z.array(z.unknown()).optional().describe('List of subaccounts'),
      createdSubaccount: z.unknown().optional().describe('Newly created subaccount details'),
      transfer: z.unknown().optional().describe('Transfer details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    switch (ctx.input.action) {
      case 'balance': {
        let bal = await client.getBalance();
        return {
          output: { balance: bal.value, autoReload: bal.autoReload },
          message: `Account balance: **${bal.value.toFixed(2)} EUR**. Auto-reload: ${bal.autoReload ? 'enabled' : 'disabled'}.`
        };
      }

      case 'list_subaccounts': {
        let subs = await client.listSubaccounts();
        return {
          output: { primaryAccount: subs.primaryAccount, subaccounts: subs.subaccounts },
          message: `Found **${subs.subaccounts.length}** subaccount(s).`
        };
      }

      case 'create_subaccount': {
        if (!ctx.input.subaccountName) throw new Error('subaccountName is required');
        let created = await client.createSubaccount({
          name: ctx.input.subaccountName,
          usePrimaryAccountBalance: ctx.input.usePrimaryAccountBalance
        });
        return {
          output: { createdSubaccount: created },
          message: `Created subaccount **${created.name}** with API key \`${created.apiKey}\``
        };
      }

      case 'transfer_credit': {
        if (
          !ctx.input.fromAccountApiKey ||
          !ctx.input.toAccountApiKey ||
          ctx.input.amount === undefined
        ) {
          throw new Error('fromAccountApiKey, toAccountApiKey, and amount are required');
        }
        let creditResult = await client.transferCredit({
          from: ctx.input.fromAccountApiKey,
          to: ctx.input.toAccountApiKey,
          amount: ctx.input.amount,
          reference: ctx.input.reference
        });
        return {
          output: { transfer: creditResult },
          message: `Transferred **${ctx.input.amount} EUR** credit from \`${ctx.input.fromAccountApiKey}\` to \`${ctx.input.toAccountApiKey}\``
        };
      }

      case 'transfer_balance': {
        if (
          !ctx.input.fromAccountApiKey ||
          !ctx.input.toAccountApiKey ||
          ctx.input.amount === undefined
        ) {
          throw new Error('fromAccountApiKey, toAccountApiKey, and amount are required');
        }
        let balResult = await client.transferBalance({
          from: ctx.input.fromAccountApiKey,
          to: ctx.input.toAccountApiKey,
          amount: ctx.input.amount,
          reference: ctx.input.reference
        });
        return {
          output: { transfer: balResult },
          message: `Transferred **${ctx.input.amount} EUR** balance from \`${ctx.input.fromAccountApiKey}\` to \`${ctx.input.toAccountApiKey}\``
        };
      }
    }
  })
  .build();
