import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let resolveBankAccount = SlateTool.create(spec, {
  name: 'Resolve Bank Account',
  key: 'resolve_bank_account',
  description: `Look up and verify bank account details by account number and bank code. Returns the account holder's name for identity verification. Can also list banks for a given country to find the correct bank code.`,
  instructions: [
    'Set action to "resolve" to verify an account, or "list_banks" to get bank codes for a country.',
    'Use bank code "flutterwave" and merchant ID as account number to resolve a Flutterwave wallet.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['resolve', 'list_banks'])
        .describe('Action: resolve an account or list banks'),
      accountNumber: z.string().optional().describe('Bank account number to resolve'),
      accountBank: z.string().optional().describe('Bank code (e.g. "044" for Access Bank)'),
      countryCode: z
        .string()
        .optional()
        .describe('Country code for listing banks (e.g. NG, GH, KE, ZA)')
    })
  )
  .output(
    z.object({
      accountName: z.string().optional().describe('Resolved account holder name'),
      accountNumber: z.string().optional().describe('Account number'),
      banks: z
        .array(
          z.object({
            bankId: z.number().optional().describe('Bank ID'),
            bankCode: z.string().describe('Bank code'),
            bankName: z.string().describe('Bank name')
          })
        )
        .optional()
        .describe('List of banks (when action is list_banks)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list_banks') {
      if (!ctx.input.countryCode) throw new Error('countryCode is required to list banks');
      let result = await client.listBanks(ctx.input.countryCode);
      let banks = (result.data || []).map((b: any) => ({
        bankId: b.id,
        bankCode: b.code,
        bankName: b.name
      }));
      return {
        output: { banks },
        message: `Found **${banks.length}** banks for ${ctx.input.countryCode}.`
      };
    }

    if (!ctx.input.accountNumber || !ctx.input.accountBank) {
      throw new Error('accountNumber and accountBank are required to resolve an account');
    }

    let result = await client.resolveBankAccount(
      ctx.input.accountNumber,
      ctx.input.accountBank
    );
    let d = result.data;

    return {
      output: {
        accountName: d.account_name,
        accountNumber: d.account_number
      },
      message: `Account **${d.account_number}** belongs to **${d.account_name}**.`
    };
  })
  .build();
