import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newDonations = SlateTrigger.create(spec, {
  name: 'New Donations',
  key: 'new_donations',
  description: 'Triggers when new donations are made from your Daffy fund.'
})
  .input(
    z.object({
      donationId: z.number().describe('Unique donation identifier'),
      amount: z.number().describe('Donation amount in USD'),
      status: z.string().describe('Donation status'),
      note: z.string().nullable().describe('Public note'),
      visibility: z.string().nullable().describe('Visibility setting'),
      createdAt: z.string().describe('Creation timestamp'),
      mailedAt: z.string().nullable().describe('Date the check was mailed'),
      nonProfitEin: z.string().describe('Non-profit EIN'),
      nonProfitName: z.string().describe('Non-profit name'),
      nonProfitCity: z.string().nullable().describe('Non-profit city'),
      nonProfitState: z.string().nullable().describe('Non-profit state')
    })
  )
  .output(
    z.object({
      donationId: z.number().describe('Unique donation identifier'),
      amount: z.number().describe('Donation amount in USD'),
      status: z
        .string()
        .describe(
          'Donation status (scheduled, waiting_for_funds, approved, rejected, completed, not_completed, check_mailed)'
        ),
      note: z.string().nullable().describe('Public note on the donation'),
      visibility: z.string().nullable().describe('Visibility setting'),
      createdAt: z.string().describe('Creation timestamp'),
      mailedAt: z.string().nullable().describe('Date the check was mailed'),
      nonProfitEin: z.string().describe('Non-profit EIN'),
      nonProfitName: z.string().describe('Non-profit name'),
      nonProfitCity: z.string().nullable().describe('Non-profit city'),
      nonProfitState: z.string().nullable().describe('Non-profit state')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.getDonations(1);

      let lastSeenId = ctx.state?.lastSeenDonationId as number | undefined;
      let newDonations = lastSeenId
        ? result.items.filter(d => d.id > lastSeenId)
        : result.items;

      let highestId =
        result.items.length > 0 ? Math.max(...result.items.map(d => d.id)) : lastSeenId;

      return {
        inputs: newDonations.map(d => ({
          donationId: d.id,
          amount: d.amount,
          status: d.status,
          note: d.note,
          visibility: d.visibility,
          createdAt: d.created_at,
          mailedAt: d.mailed_at,
          nonProfitEin: d.non_profit.ein,
          nonProfitName: d.non_profit.name,
          nonProfitCity: d.non_profit.city,
          nonProfitState: d.non_profit.state
        })),
        updatedState: {
          lastSeenDonationId: highestId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'donation.created',
        id: String(ctx.input.donationId),
        output: {
          donationId: ctx.input.donationId,
          amount: ctx.input.amount,
          status: ctx.input.status,
          note: ctx.input.note,
          visibility: ctx.input.visibility,
          createdAt: ctx.input.createdAt,
          mailedAt: ctx.input.mailedAt,
          nonProfitEin: ctx.input.nonProfitEin,
          nonProfitName: ctx.input.nonProfitName,
          nonProfitCity: ctx.input.nonProfitCity,
          nonProfitState: ctx.input.nonProfitState
        }
      };
    }
  })
  .build();
