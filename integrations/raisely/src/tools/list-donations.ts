import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let listDonations = SlateTool.create(spec, {
  name: 'List Donations',
  key: 'list_donations',
  description: `List donations within a campaign. Filter by profile, donor, or status. Returns donation amounts, donor info, and payment details. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignUuid: z.string().describe('UUID of the campaign'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of donations to return (default 20)'),
      offset: z.number().optional().describe('Number of donations to skip for pagination'),
      sort: z.string().optional().describe('Field to sort by, e.g. "createdAt", "amount"'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      profileUuid: z.string().optional().describe('Filter donations by profile UUID'),
      userUuid: z.string().optional().describe('Filter donations by donor user UUID'),
      status: z.string().optional().describe('Filter by donation status'),
      includePrivateData: z.boolean().optional().describe('Include private/custom field data')
    })
  )
  .output(
    z.object({
      donations: z.array(z.record(z.string(), z.any())).describe('List of donation objects'),
      pagination: z
        .object({
          total: z.number().optional(),
          offset: z.number().optional(),
          limit: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    let result = await client.listDonations(ctx.input.campaignUuid, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      order: ctx.input.order,
      profile: ctx.input.profileUuid,
      user: ctx.input.userUuid,
      status: ctx.input.status,
      private: ctx.input.includePrivateData
    });

    let donations = result.data || [];
    let pagination = result.pagination;

    return {
      output: { donations, pagination },
      message: `Found **${donations.length}** donation(s).`
    };
  })
  .build();
