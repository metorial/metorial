import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

let membershipSchema = z.object({
  membershipId: z.string().describe('Unique membership identifier'),
  status: z.string().describe('Membership status (active, trialing, canceled, expired, etc.)'),
  userId: z.string().nullable().describe('User ID'),
  username: z.string().nullable().describe('Username'),
  userEmail: z.string().nullable().describe('User email'),
  productId: z.string().nullable().describe('Product ID'),
  productTitle: z.string().nullable().describe('Product title'),
  planId: z.string().nullable().describe('Plan ID'),
  currency: z.string().nullable().describe('Currency code'),
  licenseKey: z.string().nullable().describe('Software license key if applicable'),
  cancelAtPeriodEnd: z.boolean().describe('Whether membership cancels at period end'),
  renewalPeriodStart: z.string().nullable().describe('Current renewal period start'),
  renewalPeriodEnd: z.string().nullable().describe('Current renewal period end'),
  createdAt: z.string().describe('ISO 8601 creation timestamp')
});

export let listMemberships = SlateTool.create(spec, {
  name: 'List Memberships',
  key: 'list_memberships',
  description: `List memberships in your Whop company. Memberships represent a user's access to a product. Filter by product, status, plan, or user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company ID. Uses config companyId if not provided.'),
      productIds: z.array(z.string()).optional().describe('Filter by product IDs'),
      statuses: z
        .array(
          z.enum([
            'trialing',
            'active',
            'past_due',
            'completed',
            'canceled',
            'expired',
            'unresolved',
            'drafted',
            'canceling'
          ])
        )
        .optional()
        .describe('Filter by membership status'),
      planIds: z.array(z.string()).optional().describe('Filter by plan IDs'),
      userIds: z.array(z.string()).optional().describe('Filter by user IDs'),
      order: z
        .enum(['id', 'created_at', 'status', 'canceled_at', 'date_joined', 'total_spend'])
        .optional()
        .describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of results (max 100)')
    })
  )
  .output(
    z.object({
      memberships: z.array(membershipSchema),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let companyId = ctx.input.companyId || ctx.config.companyId;

    let client = new WhopClient(ctx.auth.token);
    let result = await client.listMemberships({
      companyId,
      productIds: ctx.input.productIds,
      statuses: ctx.input.statuses,
      planIds: ctx.input.planIds,
      userIds: ctx.input.userIds,
      order: ctx.input.order,
      direction: ctx.input.direction,
      after: ctx.input.cursor,
      first: ctx.input.limit
    });

    let memberships = (result.data || []).map((m: any) => ({
      membershipId: m.id,
      status: m.status,
      userId: m.user?.id || null,
      username: m.user?.username || null,
      userEmail: m.user?.email || null,
      productId: m.product?.id || null,
      productTitle: m.product?.title || null,
      planId: m.plan?.id || null,
      currency: m.currency || null,
      licenseKey: m.license_key || null,
      cancelAtPeriodEnd: m.cancel_at_period_end || false,
      renewalPeriodStart: m.renewal_period_start || null,
      renewalPeriodEnd: m.renewal_period_end || null,
      createdAt: m.created_at
    }));

    return {
      output: {
        memberships,
        hasNextPage: result.page_info?.has_next_page || false,
        endCursor: result.page_info?.end_cursor || null
      },
      message: `Found **${memberships.length}** memberships.${result.page_info?.has_next_page ? ' More results available.' : ''}`
    };
  })
  .build();
