import { createApiServiceError, SlateTool } from 'slates';
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
        .enum(['resolve', 'list_banks', 'list_branches'])
        .describe('Action: resolve an account or list banks'),
      bankId: z.number().optional().describe('Bank ID from list_banks, for list_branches'),
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
      branches: z
        .array(
          z.object({
            branchId: z.number().optional(),
            branchCode: z.string(),
            branchName: z.string().optional()
          })
        )
        .optional()
        .describe('Bank branches, for list_branches'),
      accountName: z.string().optional().describe('Resolved account holder name'),
      bankId: z.number().optional().describe('Bank ID from list_banks, for list_branches'),
      accountNumber: z.string().optional().describe('Account number'),
      banks: z
        .array(
          z.object({
            bankId: z.number().optional().describe('Bank ID'),
            bankCode: z.string().describe('Bank code'),
            bankName: z.string().describe('Bank name'),
            hasBranches: z
              .boolean()
              .optional()
              .describe('Whether this bank requires a destination branch code')
          })
        )
        .optional()
        .describe('List of banks (when action is list_banks)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });

    if (ctx.input.action === 'list_branches') {
      if (ctx.input.bankId === undefined)
        throw createApiServiceError('bankId is required to list branches.');
      const result = await client.getBankBranches(ctx.input.bankId);
      return {
        output: {
          branches: result.data.map((b: any) => ({
            branchId: b.id,
            branchCode: b.branch_code,
            branchName: b.branch_name
          }))
        },
        message: `Retrieved ${result.data.length} bank branches.`
      };
    }

    if (ctx.input.action === 'list_banks') {
      if (!ctx.input.countryCode)
        throw createApiServiceError('countryCode is required to list banks');
      let result = await client.listBanks(ctx.input.countryCode);
      let banks = (result.data || []).map((b: any) => ({
        bankId: b.id,
        bankCode: b.code,
        bankName: b.name,
        hasBranches: b.has_branches
      }));
      return {
        output: { banks },
        message: `Found **${banks.length}** banks for ${ctx.input.countryCode}.`
      };
    }

    if (!ctx.input.accountNumber || !ctx.input.accountBank) {
      throw createApiServiceError(
        'accountNumber and accountBank are required to resolve an account'
      );
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
