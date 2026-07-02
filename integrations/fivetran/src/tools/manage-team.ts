import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

let teamOutputSchema = z.object({
  teamId: z.string().describe('Unique identifier of the team'),
  name: z.string().describe('Name of the team'),
  description: z.string().optional().nullable().describe('Description of the team'),
  role: z.string().optional().describe('Account-level role assigned to the team')
});

let mapTeam = (t: any) => ({
  teamId: t.id,
  name: t.name,
  description: t.description,
  role: t.role
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in the Fivetran account with their roles and descriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z.array(teamOutputSchema).describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let items = await client.listTeams();

    let teams = items.map(mapTeam);

    return {
      output: { teams },
      message: `Found **${teams.length}** team(s).`
    };
  })
  .build();

export let getTeam = SlateTool.create(spec, {
  name: 'Get Team',
  key: 'get_team',
  description: `Retrieve details of a specific team, optionally including its members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to retrieve'),
      includeMembers: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also list all users in this team')
    })
  )
  .output(
    z.object({
      team: teamOutputSchema,
      members: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Team members (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let t = await client.getTeam(ctx.input.teamId);

    let members: any[] | undefined;
    if (ctx.input.includeMembers) {
      members = await client.listTeamUsers(ctx.input.teamId);
    }

    return {
      output: { team: mapTeam(t), members },
      message: `Retrieved team **${t.name}** (${t.id}).`
    };
  })
  .build();

export let createTeam = SlateTool.create(spec, {
  name: 'Create Team',
  key: 'create_team',
  description: `Create a new team in the Fivetran account. Teams allow you to group users and manage permissions collectively.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the team'),
      description: z.string().optional().describe('Description of the team'),
      role: z
        .string()
        .optional()
        .describe('Account-level role for the team (e.g., "Account Analyst")')
    })
  )
  .output(teamOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.role) body.role = ctx.input.role;

    let t = await client.createTeam(body);

    return {
      output: mapTeam(t),
      message: `Created team **${t.name}** (${t.id}).`
    };
  })
  .build();

export let updateTeam = SlateTool.create(spec, {
  name: 'Update Team',
  key: 'update_team',
  description: `Update a team's name, description, or role.`
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to update'),
      name: z.string().optional().describe('Updated team name'),
      description: z.string().optional().describe('Updated description'),
      role: z.string().optional().describe('Updated account-level role')
    })
  )
  .output(teamOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.role) body.role = ctx.input.role;

    let t = await client.updateTeam(ctx.input.teamId, body);

    return {
      output: mapTeam(t),
      message: `Updated team **${t.name}** (${t.id}).`
    };
  })
  .build();

export let deleteTeam = SlateTool.create(spec, {
  name: 'Delete Team',
  key: 'delete_team',
  description: `Delete a team from the Fivetran account. Members are not deleted but lose team-based permissions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    await client.deleteTeam(ctx.input.teamId);

    return {
      output: { success: true },
      message: `Deleted team ${ctx.input.teamId}.`
    };
  })
  .build();

export let manageTeamMembership = SlateTool.create(spec, {
  name: 'Manage Team Membership',
  key: 'manage_team_membership',
  description: `Add or remove a user from a team. Use action "add" to add a user and "remove" to remove a user from the team.`
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      userId: z.string().describe('ID of the user to add or remove'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the user')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    if (ctx.input.action === 'add') {
      await client.addUserToTeam(ctx.input.teamId, ctx.input.userId);
    } else {
      await client.removeUserFromTeam(ctx.input.teamId, ctx.input.userId);
    }

    return {
      output: { success: true },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} user ${ctx.input.userId} ${ctx.input.action === 'add' ? 'to' : 'from'} team ${ctx.input.teamId}.`
    };
  })
  .build();
