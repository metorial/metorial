import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let listSubscriptions = SlateTool.create(spec, {
  name: 'List Subscriptions',
  key: 'list_subscriptions',
  description: `List recurring giving subscriptions within a campaign. Subscriptions represent scheduled recurring donations. Filter by profile, donor, or status (OK, PAUSED, CANCELLED, FAILING, FAILED).`,
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
        .describe('Maximum number of subscriptions to return (default 20)'),
      offset: z.number().optional().describe('Number of subscriptions to skip for pagination'),
      sort: z.string().optional().describe('Field to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      profileUuid: z.string().optional().describe('Filter by profile UUID'),
      userUuid: z.string().optional().describe('Filter by donor user UUID'),
      status: z
        .string()
        .optional()
        .describe('Filter by status: OK, PAUSED, CANCELLED, FAILING, FAILED'),
      includePrivateData: z.boolean().optional().describe('Include private/custom field data')
    })
  )
  .output(
    z.object({
      subscriptions: z
        .array(z.record(z.string(), z.any()))
        .describe('List of subscription objects'),
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

    let result = await client.listSubscriptions(ctx.input.campaignUuid, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      order: ctx.input.order,
      profile: ctx.input.profileUuid,
      user: ctx.input.userUuid,
      status: ctx.input.status,
      private: ctx.input.includePrivateData
    });

    let subscriptions = result.data || [];
    let pagination = result.pagination;

    return {
      output: { subscriptions, pagination },
      message: `Found **${subscriptions.length}** subscription(s).`
    };
  })
  .build();
