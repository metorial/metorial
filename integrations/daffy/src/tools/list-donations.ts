import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let donationItemSchema = z.object({
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
      city: z.string().nullable().describe('Non-profit city'),
      state: z.string().nullable().describe('Non-profit state')
    })
    .describe('Recipient non-profit')
});

export let listDonations = SlateTool.create(spec, {
  name: 'List Donations',
  key: 'list_donations',
  description: `Retrieve a paginated list of donations. Fetch your own complete donation history, or view another user's public donations (limited information). Use this to review giving history and track donation statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .number()
        .optional()
        .describe(
          'User ID to view public donations for. Leave empty to list your own donations.'
        ),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination (defaults to first page)')
    })
  )
  .output(
    z.object({
      donations: z.array(donationItemSchema).describe('List of donations'),
      totalCount: z.number().describe('Total number of donations'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last available page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = ctx.input.userId
      ? await client.getUserDonations(ctx.input.userId, ctx.input.page)
      : await client.getDonations(ctx.input.page);

    return {
      output: {
        donations: result.items.map(d => ({
          donationId: d.id,
          amount: d.amount,
          status: d.status,
          note: d.note,
          visibility: d.visibility,
          createdAt: d.created_at,
          mailedAt: d.mailed_at,
          nonProfit: {
            ein: d.non_profit.ein,
            name: d.non_profit.name,
            city: d.non_profit.city,
            state: d.non_profit.state
          }
        })),
        totalCount: result.meta.count,
        currentPage: result.meta.page,
        lastPage: result.meta.last
      },
      message: ctx.input.userId
        ? `Found **${result.meta.count}** public donation(s) for user ${ctx.input.userId}. Showing page ${result.meta.page} of ${result.meta.last}.`
        : `Found **${result.meta.count}** donation(s). Showing page ${result.meta.page} of ${result.meta.last}.`
    };
  })
  .build();
