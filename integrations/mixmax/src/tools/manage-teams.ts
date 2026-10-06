import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamSchema = z.object({
  teamId: z.string().describe('Team ID'),
  name: z.string().optional().describe('Team name'),
  createdAt: z.string().optional().describe('When the team was created'),
  updatedAt: z.string().optional().describe('When the team was last updated')
});

let memberSchema = z.object({
  memberId: z.string().describe('Member/user ID'),
  email: z.string().optional().describe('Member email'),
  name: z.string().optional().describe('Member name')
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List a page of teams you are a member of within the Mixmax workspace. Use nextCursor while hasNext is true to read more results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum results in one page, from 1 to 300.'),
      cursor: z.string().optional().describe('Cursor returned as nextCursor on a prior page.')
    })
  )
  .output(
    z.object({
      teams: z.array(teamSchema).describe('List of teams'),
      nextCursor: z.string().optional().describe('Provider cursor for the next page'),
      hasNext: z.boolean().optional().describe('Whether another page currently exists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listTeams({ limit: ctx.input.limit, next: ctx.input.cursor });
    let results = data.results;
    let teams = results.map(t => ({
      teamId: t._id,
      name: t.name,
      createdAt: t.createdAt,
      updatedAt: t.modifiedAt
    }));

    return {
      output: { teams, nextCursor: data.next, hasNext: data.hasNext },
      message: `Found ${teams.length} team(s).`
    };
  })
  .build();

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create, update, or delete a team. Teams organize users within a Mixmax workspace.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      teamId: z.string().optional().describe('Team ID (required for update/delete)'),
      name: z.string().optional().describe('Team name (required for create)')
    })
  )
  .output(
    z.object({
      teamId: z.string().optional().describe('Team ID'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw createApiServiceError('name is required for create');
      let result = await client.createTeam({ name: ctx.input.name });
      return {
        output: { teamId: result._id, success: true },
        message: `Team "${ctx.input.name}" created.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.teamId) throw createApiServiceError('teamId is required for update');
      let updates: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updates.name = ctx.input.name;
      await client.updateTeam(ctx.input.teamId, updates);
      return {
        output: { teamId: ctx.input.teamId, success: true },
        message: `Team ${ctx.input.teamId} updated.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.teamId) throw createApiServiceError('teamId is required for delete');
      await client.deleteTeam(ctx.input.teamId);
      return {
        output: { teamId: ctx.input.teamId, success: true },
        message: `Team ${ctx.input.teamId} deleted.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();

export let listTeamMembers = SlateTool.create(spec, {
  name: 'List Team Members',
  key: 'list_team_members',
  description: `List all members of a specific team. This endpoint returns the complete member collection and does not support paging.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of team members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listTeamMembers(ctx.input.teamId);
    let results = data.results;
    let members = results.map(m => ({
      memberId: m._id,
      email: m.email,
      name: m.name
    }));

    return {
      output: { members },
      message: `Found ${members.length} team member(s).`
    };
  })
  .build();

export let manageTeamMembership = SlateTool.create(spec, {
  name: 'Manage Team Membership',
  key: 'manage_team_membership',
  description: `Invite a member by email or remove a member by membership ID. Invitations send email and may affect billing; adding by userId is unsupported.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the member'),
      teamId: z.string().describe('ID of the team'),
      email: z.string().optional().describe('Email of the member (for adding)'),
      userId: z
        .string()
        .optional()
        .describe(
          'Legacy field; invitations require email and do not support adding by user ID.'
        ),
      memberId: z.string().optional().describe('Member ID to remove (for removing)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'add') {
      await client.addTeamMember(ctx.input.teamId, {
        email: ctx.input.email,
        userId: ctx.input.userId
      });
      return {
        output: { success: true },
        message: `Member added to team ${ctx.input.teamId}.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.memberId) throw createApiServiceError('memberId is required for remove');
      await client.removeTeamMember(ctx.input.teamId, ctx.input.memberId);
      return {
        output: { success: true },
        message: `Member ${ctx.input.memberId} removed from team ${ctx.input.teamId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
