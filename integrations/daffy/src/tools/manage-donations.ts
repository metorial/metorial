import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let donationSchema = z.object({
  donationId: z.number().describe('Unique donation identifier'),
  amount: z.number().describe('Donation amount in USD'),
  status: z
    .string()
    .describe(
      'Donation status (scheduled, waiting_for_funds, approved, rejected, completed, not_completed, check_mailed)'
    ),
  note: z.string().nullable().describe('Public note on the donation'),
  visibility: z.string().nullable().describe('Donation visibility setting'),
  createdAt: z.string().describe('Creation timestamp'),
  mailedAt: z.string().nullable().describe('Date the check was mailed'),
  nonProfit: z
    .object({
      ein: z.string().describe('Non-profit EIN'),
      name: z.string().describe('Non-profit name'),
      website: z.string().nullable().describe('Non-profit website'),
      city: z.string().nullable().describe('Non-profit city'),
      state: z.string().nullable().describe('Non-profit state')
    })
    .describe('Recipient non-profit')
});

export let createDonation = SlateTool.create(spec, {
  name: 'Create Donation',
  key: 'create_donation',
  description: `Create a new donation to a U.S. nonprofit from your Daffy donor-advised fund. Specify the amount in USD and the nonprofit's EIN. You can optionally include a public note visible on your giving history or a private memo for your records.`,
  instructions: [
    "Use the Search Nonprofits tool to find a nonprofit EIN if you don't have one."
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      amount: z.number().describe('Donation amount in USD'),
      ein: z
        .string()
        .describe('EIN (Employer Identification Number) of the nonprofit to donate to'),
      note: z.string().optional().describe('Public note displayed on the donation'),
      privateMemo: z.string().optional().describe('Private memo not displayed publicly')
    })
  )
  .output(donationSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let donation = await client.createDonation({
      amount: ctx.input.amount,
      ein: ctx.input.ein,
      note: ctx.input.note,
      privateMemo: ctx.input.privateMemo
    });

    return {
      output: {
        donationId: donation.id,
        amount: donation.amount,
        status: donation.status,
        note: donation.note,
        visibility: donation.visibility,
        createdAt: donation.created_at,
        mailedAt: donation.mailed_at,
        nonProfit: {
          ein: donation.non_profit.ein,
          name: donation.non_profit.name,
          website: donation.non_profit.website,
          city: donation.non_profit.city,
          state: donation.non_profit.state
        }
      },
      message: `Created donation of **$${donation.amount.toFixed(2)}** to **${donation.non_profit.name}** (EIN: ${donation.non_profit.ein}). Status: ${donation.status}.`
    };
  })
  .build();

export let cancelDonation = SlateTool.create(spec, {
  name: 'Cancel Donation',
  key: 'cancel_donation',
  description: `Cancel a pending donation that hasn't been processed yet. Only donations owned by the authenticated user that haven't been accepted or rejected can be cancelled.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      donationId: z.number().describe('ID of the donation to cancel')
    })
  )
  .output(
    z.object({
      cancelled: z.boolean().describe('Whether the donation was successfully cancelled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.cancelDonation(ctx.input.donationId);

    return {
      output: {
        cancelled: true
      },
      message: `Donation **#${ctx.input.donationId}** has been cancelled.`
    };
  })
  .build();
