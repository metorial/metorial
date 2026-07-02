import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let listUsersTeams = SlateTool.create(spec, {
  name: 'List Users & Teams',
  key: 'list_users_teams',
  description: `List users and/or teams in Nutshell CRM. Use this to discover available assignees for leads, tasks, and activities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeUsers: z
        .boolean()
        .optional()
        .describe('Include users in results (default: true)'),
      includeTeams: z
        .boolean()
        .optional()
        .describe('Include teams in results (default: true)'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number (default: 1)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('ID of the user'),
            name: z.string().describe('User name'),
            emails: z.array(z.any()).optional().describe('User email addresses'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .optional()
        .describe('List of users'),
      teams: z
        .array(
          z.object({
            teamId: z.number().describe('ID of the team'),
            name: z.string().describe('Team name'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .optional()
        .describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let includeUsers = ctx.input.includeUsers !== false;
    let includeTeams = ctx.input.includeTeams !== false;

    let users: any[] = [];
    let teams: any[] = [];

    if (includeUsers) {
      let userResults = await client.findUsers({
        limit: ctx.input.limit,
        page: ctx.input.page
      });
      users = userResults.map((u: any) => ({
        userId: u.id,
        name: u.name,
        emails: u.email || u.emails,
        entityType: u.entityType
      }));
    }

    if (includeTeams) {
      let teamResults = await client.findTeams({
        limit: ctx.input.limit,
        page: ctx.input.page
      });
      teams = teamResults.map((t: any) => ({
        teamId: t.id,
        name: t.name,
        entityType: t.entityType
      }));
    }

    let parts: string[] = [];
    if (includeUsers) parts.push(`**${users.length}** user(s)`);
    if (includeTeams) parts.push(`**${teams.length}** team(s)`);

    return {
      output: {
        users: includeUsers ? users : undefined,
        teams: includeTeams ? teams : undefined
      },
      message: `Found ${parts.join(' and ')}.`
    };
  })
  .build();
