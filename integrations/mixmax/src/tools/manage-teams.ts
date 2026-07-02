import { SlateTool } from 'slates';
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
  description: `List teams you are a member of within the Mixmax workspace.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z.array(teamSchema).describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listTeams();
    let results = data.results || data || [];
    let teams = results.map((t: any) => ({
      teamId: t._id,
      name: t.name,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: { teams },
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
      if (!ctx.input.name) throw new Error('name is required for create');
      let result = await client.createTeam({ name: ctx.input.name });
      return {
        output: { teamId: result._id, success: true },
        message: `Team "${ctx.input.name}" created.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.teamId) throw new Error('teamId is required for update');
      let updates: Record<string, any> = {};
      if (ctx.input.name) updates.name = ctx.input.name;
      await client.updateTeam(ctx.input.teamId, updates);
      return {
        output: { teamId: ctx.input.teamId, success: true },
        message: `Team ${ctx.input.teamId} updated.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.teamId) throw new Error('teamId is required for delete');
      await client.deleteTeam(ctx.input.teamId);
      return {
        output: { teamId: ctx.input.teamId, success: true },
        message: `Team ${ctx.input.teamId} deleted.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

export let listTeamMembers = SlateTool.create(spec, {
  name: 'List Team Members',
  key: 'list_team_members',
  description: `List all members of a specific team.`,
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
    let results = data.results || data || [];
    let members = results.map((m: any) => ({
      memberId: m._id || m.userId,
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
  description: `Add or remove members from a team. Provide either an email address or user ID to identify the member.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the member'),
      teamId: z.string().describe('ID of the team'),
      email: z.string().optional().describe('Email of the member (for adding)'),
      userId: z.string().optional().describe('User ID of the member (for adding)'),
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
      if (!ctx.input.memberId) throw new Error('memberId is required for remove');
      await client.removeTeamMember(ctx.input.teamId, ctx.input.memberId);
      return {
        output: { success: true },
        message: `Member ${ctx.input.memberId} removed from team ${ctx.input.teamId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
