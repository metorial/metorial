import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { donationItemSchema, mapDonation } from '../lib/donations';
import { spec } from '../spec';

export let getDonation = SlateTool.create(spec, {
  name: 'Get Donation',
  key: 'get_donation',
  description:
    'Retrieve one donation by ID to check its status and recipient. Omit userId for your own donation, or use get_user_profile to discover another donor’s user ID. Other users’ donations must be public and may hide the amount.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      donationId: z.number().describe('Donation ID from list_donations or create_donation'),
      userId: z
        .number()
        .optional()
        .describe('Donor user ID from get_user_profile. Omit to use the authenticated user.')
    })
  )
  .output(donationItemSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let userId = ctx.input.userId ?? (await client.getMe()).id;
    let donation = await client.getDonation(userId, ctx.input.donationId);

    return {
      output: mapDonation(donation),
      message: `Donation **#${donation.id}** to **${donation.non_profit.name}** has status **${donation.status}**.`
    };
  })
  .build();
