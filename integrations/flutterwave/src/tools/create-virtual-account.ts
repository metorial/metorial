import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createVirtualAccount = SlateTool.create(spec, {
  name: 'Create Virtual Account',
  key: 'create_virtual_account',
  description: `Generate a virtual bank account number for receiving payments via bank transfer. Supports dynamic (temporary, single-use) and static (permanent) accounts. Currently available for NGN and GHS.`,
  instructions: [
    'For static (permanent) accounts, set isPermanent to true. BVN is required for live static accounts.',
    'For dynamic (one-time) accounts, provide the amount expected.'
  ],
  constraints: [
    'Virtual accounts are only available for NGN and GHS currencies.',
    'BVN is required for permanent accounts in production.'
  ]
})
  .input(
    z.object({
      email: z.string().describe('Customer email address'),
      txRef: z.string().describe('Unique transaction reference'),
      isPermanent: z
        .boolean()
        .optional()
        .describe('true for static/permanent account, false for dynamic/temporary'),
      amount: z
        .number()
        .optional()
        .describe('Expected payment amount (required for dynamic accounts)'),
      currency: z.enum(['NGN', 'GHS']).optional().describe('Currency (NGN or GHS)'),
      bvn: z
        .string()
        .optional()
        .describe('Bank Verification Number (required for permanent accounts in production)'),
      firstname: z.string().optional().describe('Customer first name'),
      lastname: z.string().optional().describe('Customer last name'),
      phonenumber: z.string().optional().describe('Customer phone number'),
      narration: z.string().optional().describe('Account description/narration')
    })
  )
  .output(
    z.object({
      orderRef: z
        .string()
        .optional()
        .describe('Order reference for tracking the virtual account'),
      accountNumber: z.string().describe('Generated virtual account number'),
      bankName: z.string().describe('Bank name for the virtual account'),
      amount: z.number().optional().describe('Expected amount (for dynamic accounts)'),
      expiryDate: z.string().optional().describe('Account expiry date (for dynamic accounts)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createVirtualAccount({
      email: ctx.input.email,
      txRef: ctx.input.txRef,
      isPermanent: ctx.input.isPermanent,
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      bvn: ctx.input.bvn,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      phonenumber: ctx.input.phonenumber,
      narration: ctx.input.narration
    });

    let d = result.data;

    return {
      output: {
        orderRef: d.order_ref,
        accountNumber: d.account_number,
        bankName: d.bank_name,
        amount: d.amount,
        expiryDate: d.expiry_date
      },
      message: `Virtual account created: **${d.account_number}** at **${d.bank_name}**${d.expiry_date ? ` (expires ${d.expiry_date})` : ' (permanent)'}.`
    };
  })
  .build();
