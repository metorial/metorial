import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let payoutSchema = z.object({
  payoutId: z.string().describe('Unique identifier of the payout'),
  campaignId: z.number().nullable().describe('Campaign ID'),
  method: z.string().nullable().describe('Payout method (check or bank)'),
  status: z
    .string()
    .nullable()
    .describe('Payout status: pending, processing, completed, cancelled, or failed'),
  amount: z.number().nullable().describe('Gross amount'),
  fee: z.number().nullable().describe('Fee amount'),
  tip: z.number().nullable().describe('Tip amount'),
  payout: z.number().nullable().describe('Net payout amount'),
  currency: z.string().nullable().describe('Currency code'),
  memo: z.string().nullable().describe('Payout memo'),
  address: z
    .object({
      address1: z.string().nullable(),
      address2: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      zipcode: z.string().nullable(),
      country: z.string().nullable()
    })
    .nullable()
    .optional()
    .describe('Payout destination address'),
  completedAt: z.string().nullable().describe('When the payout completed'),
  createdAt: z.string().nullable().describe('When the payout was created'),
  raw: z
    .record(z.string(), z.unknown())
    .describe('Original payout data returned by Givebutter')
});

let listPayoutsOutputSchema = z.object({
  payouts: z.array(payoutSchema).describe('List of payouts'),
  totalCount: z.number().describe('Total number of payouts'),
  currentPage: z.number().describe('Current page'),
  lastPage: z.number().describe('Last page')
});

export let listPayouts = SlateTool.create(spec, {
  name: 'List Payouts',
  key: 'list_payouts',
  description: `Retrieve a paginated list of payout records representing transfers of raised funds to the organization's bank account.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Items per page, from 1 to 100')
    })
  )
  .output(listPayoutsOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPayouts({
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let payouts = result.data.map((p: any) => ({
      payoutId: String(p.id),
      campaignId: p.campaign_id,
      method: p.method,
      status: p.status,
      amount: p.amount,
      fee: p.fee,
      tip: p.tip,
      payout: p.payout,
      currency: p.currency,
      memo: p.memo,
      address: p.address
        ? {
            address1: p.address.address_1,
            address2: p.address.address_2,
            city: p.address.city,
            state: p.address.state,
            zipcode: p.address.zipcode,
            country: p.address.country
          }
        : p.address,
      completedAt: p.paid_at,
      createdAt: p.created_at,
      raw: client.rawData(p)
    }));

    return {
      output: client.output(listPayoutsOutputSchema, {
        payouts,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      }),
      message: client.publicData(
        `Found **${result.meta.total}** payouts (page ${result.meta.current_page} of ${result.meta.last_page}).`
      )
    };
  })
  .build();

let getPayoutOutputSchema = payoutSchema;

export let getPayout = SlateTool.create(spec, {
  name: 'Get Payout',
  key: 'get_payout',
  description: `Retrieve detailed information about a specific payout including amount, fees, status, and destination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      payoutId: z.string().describe('ID of the payout to retrieve')
    })
  )
  .output(getPayoutOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let p = await client.getPayout(ctx.input.payoutId);

    return {
      output: client.output(getPayoutOutputSchema, {
        payoutId: String(p.id),
        campaignId: p.campaign_id,
        method: p.method,
        status: p.status,
        amount: p.amount,
        fee: p.fee,
        tip: p.tip,
        payout: p.payout,
        currency: p.currency,
        memo: p.memo,
        address: p.address
          ? {
              address1: p.address.address_1,
              address2: p.address.address_2,
              city: p.address.city,
              state: p.address.state,
              zipcode: p.address.zipcode,
              country: p.address.country
            }
          : p.address,
        completedAt: p.paid_at,
        createdAt: p.created_at,
        raw: client.rawData(p)
      }),
      message: client.publicData(`Retrieved payout **${p.id}**.`)
    };
  })
  .build();
