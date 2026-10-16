import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { donationItemSchema, mapDonation } from '../lib/donations';
import { spec } from '../spec';

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
          'User ID from get_user_profile to view public donations for. Leave empty to list your own donations.'
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

    let result =
      ctx.input.userId !== undefined
        ? await client.getUserDonations(ctx.input.userId, ctx.input.page)
        : await client.getDonations(ctx.input.page);

    return {
      output: {
        donations: result.items.map(mapDonation),
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
