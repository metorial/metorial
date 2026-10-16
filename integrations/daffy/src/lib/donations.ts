import { z } from 'zod';
import type { DaffyDonation } from './client';

export let donationItemSchema = z.object({
  donationId: z.number().describe('Unique donation identifier'),
  amount: z.number().optional().describe('Donation amount in USD, when visible'),
  status: z.string().describe('Current donation status'),
  note: z.string().nullable().describe('Public note on the donation'),
  visibility: z
    .string()
    .nullable()
    .optional()
    .describe('Donation visibility setting, when visible'),
  createdAt: z.string().describe('Creation timestamp'),
  mailedAt: z.string().nullable().describe('Date the check was mailed'),
  scheduledDonationId: z
    .number()
    .nullable()
    .optional()
    .describe('Related scheduled donation ID, when available'),
  userId: z.number().optional().describe('Donor user ID, when included'),
  nonProfit: z.object({
    ein: z.string().describe('Nonprofit EIN'),
    name: z.string().describe('Nonprofit name'),
    city: z.string().nullable().describe('Nonprofit city'),
    state: z.string().nullable().describe('Nonprofit state'),
    website: z.string().nullable().describe('Nonprofit website'),
    publicUrl: z.string().describe('Nonprofit profile URL'),
    causeId: z.number().describe('Primary cause ID')
  }),
  fund: z
    .object({
      fundId: z.number(),
      name: z.string()
    })
    .optional()
    .describe('Donor fund details, when included'),
  user: z
    .object({
      userId: z.number(),
      name: z.string(),
      city: z.string(),
      avatar: z.string(),
      slug: z.string()
    })
    .optional()
    .describe('Donor profile details, when included')
});

export let mapDonation = (donation: DaffyDonation) => ({
  donationId: donation.id,
  amount: donation.amount ?? undefined,
  status: donation.status,
  note: donation.note,
  visibility: donation.visibility,
  createdAt: donation.created_at,
  mailedAt: donation.mailed_at,
  scheduledDonationId: donation.scheduled_donation_id,
  userId: donation.user_id ?? donation.user?.id,
  nonProfit: {
    ein: donation.non_profit.ein,
    name: donation.non_profit.name,
    city: donation.non_profit.city,
    state: donation.non_profit.state,
    website: donation.non_profit.website,
    publicUrl: donation.non_profit.public_url,
    causeId: donation.non_profit.cause_id
  },
  fund: donation.fund ? { fundId: donation.fund.id, name: donation.fund.name } : undefined,
  user: donation.user
    ? {
        userId: donation.user.id,
        name: donation.user.name,
        city: donation.user.city,
        avatar: donation.user.avatar,
        slug: donation.user.slug
      }
    : undefined
});
