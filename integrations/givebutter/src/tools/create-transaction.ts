import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTransaction = SlateTool.create(spec, {
  name: 'Create Transaction',
  key: 'create_transaction',
  description: `Record a manual transaction for donations collected outside of Givebutter. This does **not** charge the donor — it only creates a record. Amounts must be positive (zero allowed only for "in_kind" payment method).`,
  instructions: [
    'Accepted payment methods: card, ach, check, cash, digital_wallet, paypal, venmo, donor_advised_fund, stock, in_kind, property, other.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('Donor first name'),
      lastName: z.string().describe('Donor last name'),
      email: z.string().describe('Donor email address'),
      amount: z.number().describe('Donation amount (must be positive, in cents)'),
      method: z
        .enum([
          'card',
          'ach',
          'check',
          'cash',
          'digital_wallet',
          'paypal',
          'venmo',
          'donor_advised_fund',
          'stock',
          'in_kind',
          'property',
          'other'
        ])
        .describe('Payment method'),
      campaignId: z.number().optional().describe('Campaign ID to credit'),
      campaignCode: z.string().optional().describe('Campaign code to credit'),
      phone: z.string().optional().describe('Donor phone number'),
      company: z.string().optional().describe('Donor company'),
      address: z
        .object({
          address1: z.string().optional().describe('Street address'),
          address2: z.string().optional().describe('Address line 2'),
          city: z.string().optional().describe('City'),
          state: z.string().optional().describe('State'),
          zipcode: z.string().optional().describe('ZIP code'),
          country: z.string().optional().describe('Country')
        })
        .optional()
        .describe('Donor address'),
      fundId: z.string().optional().describe('Fund ID to designate the donation'),
      transactedAt: z
        .string()
        .optional()
        .describe('When the transaction occurred (ISO 8601). Defaults to now.')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('ID of the created transaction'),
      campaignId: z.number().nullable().describe('Campaign ID'),
      amount: z.number().nullable().describe('Transaction amount'),
      status: z.string().nullable().describe('Transaction status'),
      createdAt: z.string().nullable().describe('When created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let address = ctx.input.address
      ? {
          address_1: ctx.input.address.address1,
          address_2: ctx.input.address.address2,
          city: ctx.input.address.city,
          state: ctx.input.address.state,
          zipcode: ctx.input.address.zipcode,
          country: ctx.input.address.country
        }
      : undefined;

    let t = await client.createTransaction({
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      email: ctx.input.email,
      amount: ctx.input.amount,
      method: ctx.input.method,
      campaign_id: ctx.input.campaignId,
      campaign_code: ctx.input.campaignCode,
      phone: ctx.input.phone,
      company: ctx.input.company,
      address,
      fund_id: ctx.input.fundId,
      transacted_at: ctx.input.transactedAt
    });

    return {
      output: {
        transactionId: String(t.id),
        campaignId: t.campaign_id ?? null,
        amount: t.amount ?? null,
        status: t.status ?? null,
        createdAt: t.created_at ?? null
      },
      message: `Created transaction **${t.id}** — ${ctx.input.amount} from ${ctx.input.firstName} ${ctx.input.lastName}.`
    };
  })
  .build();
