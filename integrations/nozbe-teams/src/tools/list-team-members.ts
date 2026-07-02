import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ListParams } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  memberId: z.string().describe('Team member record ID'),
  teamId: z.string().describe('Team ID'),
  userId: z.string().describe('User ID'),
  alias: z.string().nullable().optional().describe('Member alias/display name'),
  description: z.string().nullable().optional().describe('Member description'),
  role: z.string().optional().describe('Role: owner, admin, or member'),
  status: z
    .string()
    .optional()
    .describe('Status: active, pending, requesting_join, archived, or expired'),
  isFavorite: z.boolean().optional().describe('Whether the member is favorited')
});

export let listTeamMembers = SlateTool.create(spec, {
  name: 'List Team Members',
  key: 'list_team_members',
  description: `Retrieve team members from Nozbe Teams. Returns member details including role, status, and user information. Use this to find user IDs for task assignment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sortBy: z.string().optional().describe('Sort fields, e.g. "alias" or "-role"'),
      limit: z.number().optional().describe('Maximum number of members to return'),
      offset: z.number().optional().describe('Number of members to skip')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of team members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: ListParams = {};
    if (ctx.input.sortBy) params.sortBy = ctx.input.sortBy;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let members = await client.listTeamMembers(params);

    let mapped = members.map((m: any) => ({
      memberId: m.id,
      teamId: m.team_id,
      userId: m.user_id,
      alias: m.alias,
      description: m.description,
      role: m.role,
      status: m.status,
      isFavorite: m.is_favorite
    }));

    return {
      output: { members: mapped },
      message: `Found **${mapped.length}** team member(s).`
    };
  })
  .build();
