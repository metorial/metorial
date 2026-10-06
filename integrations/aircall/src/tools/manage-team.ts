import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail, id, mapTeam, text } from '../lib/contracts';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create or delete teams, and add or remove users from teams. Teams are used in call distribution for numbers. Retrieve team details with user membership.`,
  constraints: ['Team names must be unique and max 64 characters.']
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete', 'get', 'list', 'add_user', 'remove_user'])
        .describe('The operation to perform'),
      teamId: z
        .number()
        .optional()
        .describe('Team ID (required for delete, get, add_user, remove_user)'),
      teamName: z
        .string()
        .optional()
        .describe('Team name (required for create, fewer than 64 characters, must be unique)'),
      userId: z
        .number()
        .optional()
        .describe('User ID (required for add_user and remove_user)'),
      page: z.number().optional().describe('Page number for list action (default: 1)'),
      perPage: z.number().optional().describe('Results per page for list action (max: 50)')
    })
  )
  .output(
    z.object({
      teamId: z.number().optional().describe('Team ID'),
      teamName: z.string().optional().describe('Team name'),
      users: z
        .array(
          z.object({
            userId: z.number(),
            name: z.string()
          })
        )
        .optional()
        .describe('Team members'),
      teams: z
        .array(
          z.object({
            teamId: z.number(),
            teamName: z.string(),
            userCount: z.number()
          })
        )
        .optional()
        .describe('List of teams (for list action)'),
      currentPage: z.number().optional(),
      perPage: z.number().optional(),
      nextPageLink: z.string().nullable().optional(),
      totalCount: z.number().optional().describe('Total teams count (for list action)'),
      accepted: z.boolean().optional(),
      confirmed: z.boolean().optional(),
      pending: z.boolean().optional(),
      invitationSent: z.boolean().optional(),
      deleted: z.boolean().optional().describe('Whether the team was deleted')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth),
      action = ctx.input.action;
    if (action === 'list') {
      const result = await client.listTeams(ctx.input);
      return {
        output: {
          teams: result.items.map(v => {
            const t = mapTeam(v);
            return { teamId: t.teamId, teamName: t.teamName, userCount: t.users.length };
          }),
          totalCount: result.meta.total,
          currentPage: result.meta.currentPage,
          perPage: result.meta.perPage,
          nextPageLink: result.meta.nextPageLink
        },
        message: `Retrieved ${result.items.length} teams from native page ${result.meta.currentPage}.`
      };
    }
    if (action === 'create') {
      const team = mapTeam(await client.createTeam(text(ctx.input.teamName, 'teamName', 63)));
      return {
        output: team,
        message:
          'Created the native team with its returned membership; future routing effects remain separate.'
      };
    }
    const teamId = id(ctx.input.teamId, 'teamId');
    if (action === 'get')
      return {
        output: mapTeam(await client.getTeam(teamId)),
        message: 'Retrieved exact native team and membership.'
      };
    if (action === 'delete') {
      await client.deleteTeam(teamId);
      return {
        output: { teamId, deleted: true, confirmed: true },
        message:
          'Confirmed team absence. Deletion removes it from number routing; users and calls are retained.'
      };
    }
    const userId = id(ctx.input.userId, 'userId');
    await client.getUser(userId);
    if (action === 'add_user') await client.addUserToTeam(teamId, userId);
    else await client.removeUserFromTeam(teamId, userId);
    const team = mapTeam(await client.getTeam(teamId));
    if (team.users.some(v => v.userId === userId) !== (action === 'add_user'))
      fail(
        'The membership acknowledgement is not yet confirmed by native team readback.',
        'aircall_pending'
      );
    return {
      output: { ...team, confirmed: true },
      message:
        'Verified current native team membership; existing calls and audit effects remain retained.'
    };
  })
  .build();
