import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let beneficiarySchema = z.object({
  beneficiaryId: z.number().describe('Beneficiary ID'),
  accountNumber: z.string().optional().describe('Beneficiary account number'),
  bankCode: z.string().optional().describe('Bank code'),
  bankName: z.string().optional().describe('Bank name'),
  fullName: z.string().optional().describe('Beneficiary full name'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let manageBeneficiaries = SlateTool.create(spec, {
  name: 'Manage Beneficiaries',
  key: 'manage_beneficiaries',
  description: `Create, list, retrieve, or delete saved transfer beneficiaries. Beneficiaries are saved recipient details for recurring payouts, so you don't have to enter bank details each time.`,
  instructions: [
    'Use action "create" to save a new beneficiary with account details.',
    'Use action "list" to see all saved beneficiaries.',
    'Use action "get" to retrieve a specific beneficiary.',
    'Use action "delete" to remove a saved beneficiary.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'get', 'delete']).describe('Action to perform'),
      beneficiaryId: z.number().optional().describe('Beneficiary ID (for get/delete)'),
      accountNumber: z.string().optional().describe('Account number (for create)'),
      accountBank: z.string().optional().describe('Bank code (for create)'),
      beneficiaryName: z.string().optional().describe('Recipient full name (for create)')
    })
  )
  .output(
    z.object({
      beneficiaries: z.array(beneficiarySchema).describe('Beneficiary record(s)'),
      deleted: z.boolean().optional().describe('Whether the beneficiary was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.accountNumber || !ctx.input.accountBank || !ctx.input.beneficiaryName) {
        throw new Error(
          'accountNumber, accountBank, and beneficiaryName are required to create a beneficiary'
        );
      }
      let result = await client.createBeneficiary({
        accountNumber: ctx.input.accountNumber,
        accountBank: ctx.input.accountBank,
        beneficiaryName: ctx.input.beneficiaryName
      });
      let b = result.data;
      return {
        output: {
          beneficiaries: [
            {
              beneficiaryId: b.id,
              accountNumber: b.account_number,
              bankCode: b.bank_code,
              bankName: b.bank_name,
              fullName: b.full_name,
              createdAt: b.created_at
            }
          ]
        },
        message: `Beneficiary **${b.full_name}** created at **${b.bank_name}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.beneficiaryId) throw new Error('beneficiaryId is required');
      let result = await client.getBeneficiary(ctx.input.beneficiaryId);
      let b = result.data;
      return {
        output: {
          beneficiaries: [
            {
              beneficiaryId: b.id,
              accountNumber: b.account_number,
              bankCode: b.bank_code,
              bankName: b.bank_name,
              fullName: b.full_name,
              createdAt: b.created_at
            }
          ]
        },
        message: `Beneficiary **${b.full_name}** — ${b.bank_name} (${b.account_number}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.beneficiaryId) throw new Error('beneficiaryId is required');
      await client.deleteBeneficiary(ctx.input.beneficiaryId);
      return {
        output: {
          beneficiaries: [],
          deleted: true
        },
        message: `Beneficiary **${ctx.input.beneficiaryId}** has been deleted.`
      };
    }

    // list
    let result = await client.listBeneficiaries();
    let beneficiaries = (result.data || []).map((b: any) => ({
      beneficiaryId: b.id,
      accountNumber: b.account_number,
      bankCode: b.bank_code,
      bankName: b.bank_name,
      fullName: b.full_name,
      createdAt: b.created_at
    }));

    return {
      output: { beneficiaries },
      message: `Found **${beneficiaries.length}** beneficiaries.`
    };
  })
  .build();
