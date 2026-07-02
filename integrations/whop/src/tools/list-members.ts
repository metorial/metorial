import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  memberId: z.string().describe('Unique member identifier'),
  userId: z.string().nullable().describe('User ID'),
  username: z.string().nullable().describe('Username'),
  userName: z.string().nullable().describe('Display name'),
  userEmail: z.string().nullable().describe('User email'),
  accessLevel: z.string().describe('Access level (no_access, admin, customer)'),
  status: z.string().describe('Member status (drafted, joined, left)'),
  usdTotalSpent: z.number().describe('Total spent in USD'),
  joinedAt: z.string().nullable().describe('ISO 8601 join timestamp'),
  createdAt: z.string().describe('ISO 8601 creation timestamp')
});

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List members of your Whop company. Members represent the relationship between a user and your company. Search by name, username, or email, and filter by status or access level.`,
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
      query: z.string().optional().describe('Search by name, username, or email'),
      statuses: z
        .array(z.enum(['drafted', 'joined', 'left']))
        .optional()
        .describe('Filter by member status'),
      accessLevel: z
        .enum(['no_access', 'admin', 'customer'])
        .optional()
        .describe('Filter by access level'),
      productIds: z.array(z.string()).optional().describe('Filter by product IDs'),
      order: z
        .enum(['id', 'usd_total_spent', 'created_at', 'joined_at', 'most_recent_action'])
        .optional()
        .describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of results (max 100)')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let companyId = ctx.input.companyId || ctx.config.companyId;
    if (!companyId) throw new Error('companyId is required');

    let client = new WhopClient(ctx.auth.token);
    let result = await client.listMembers({
      companyId,
      query: ctx.input.query,
      statuses: ctx.input.statuses,
      accessLevel: ctx.input.accessLevel,
      productIds: ctx.input.productIds,
      order: ctx.input.order,
      direction: ctx.input.direction,
      after: ctx.input.cursor,
      first: ctx.input.limit
    });

    let members = (result.data || []).map((m: any) => ({
      memberId: m.id,
      userId: m.user?.id || null,
      username: m.user?.username || null,
      userName: m.user?.name || null,
      userEmail: m.user?.email || null,
      accessLevel: m.access_level,
      status: m.status,
      usdTotalSpent: m.usd_total_spent || 0,
      joinedAt: m.joined_at || null,
      createdAt: m.created_at
    }));

    return {
      output: {
        members,
        hasNextPage: result.page_info?.has_next_page || false,
        endCursor: result.page_info?.end_cursor || null
      },
      message: `Found **${members.length}** members.${result.page_info?.has_next_page ? ' More results available.' : ''}`
    };
  })
  .build();
