import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  AdminClient,
  teamMembersResponseSchema,
  teamSpendingResponseSchema
} from '../lib/admin-client';
import { spec } from '../spec';

export const listTeamMembers = SlateTool.create(spec, {
  name: 'List Team Members',
  key: 'list_team_members',
  description:
    'List current and removed Cursor team members with their encoded user IDs, names, emails, and roles. Requires an Enterprise Admin API key with admin:* permissions. Use the IDs with remove_team_member; usage metrics use a separate numeric ID namespace, so filter usage by email.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(teamMembersResponseSchema)
  .handleInvocation(async ctx => {
    const output = await new AdminClient(ctx.auth).listTeamMembers();
    return {
      output,
      message: `Found **${output.teamMembers.filter(m => !m.isRemoved).length}** active member(s).`
    };
  })
  .build();

export const getTeamSpending = SlateTool.create(spec, {
  name: 'Get Team Spending',
  key: 'get_team_spending',
  description:
    'Get current-cycle Cursor team spending with encoded member IDs, on-demand and overall spending in cents, and effective user limits. Requires an Enterprise Admin API key with admin:* permissions.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      searchTerm: z.string().optional().describe('Search member name or email.'),
      sortBy: z.enum(['amount', 'date', 'user']).optional(),
      sortDirection: z.enum(['asc', 'desc']).optional(),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1.'),
      pageSize: z.number().int().min(1).optional().describe('Members per page.')
    })
  )
  .output(teamSpendingResponseSchema)
  .handleInvocation(async ctx => {
    const output = await new AdminClient(ctx.auth).getTeamSpending(ctx.input);
    return {
      output,
      message: `Retrieved spending for **${output.teamMemberSpend.length}** member(s).`
    };
  })
  .build();
