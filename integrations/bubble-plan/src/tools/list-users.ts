import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users & Teams',
  key: 'list_users',
  description: `Retrieve the list of users and teams in the organization. Includes user profiles and team memberships. Also returns company information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('Specific user ID to retrieve (omit for all users)'),
      includeTeams: z
        .boolean()
        .optional()
        .describe('Whether to include teams in the response')
        .default(true),
      includeCompany: z
        .boolean()
        .optional()
        .describe('Whether to include company info in the response')
        .default(false)
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            email: z.string().optional().describe('User email'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            avatar: z.string().optional().describe('Avatar URL'),
            dateCreated: z.string().optional().describe('Account creation date')
          })
        )
        .describe('List of users'),
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('Team ID'),
            teamName: z.string().describe('Team name'),
            color: z.string().optional().describe('Team color'),
            users: z.array(z.any()).optional().describe('Team members')
          })
        )
        .optional()
        .describe('List of teams'),
      company: z
        .object({
          companyId: z.string().describe('Company ID'),
          companyName: z.string().describe('Company name'),
          domain: z.string().optional().describe('Company domain'),
          currency: z.string().optional().describe('Company currency'),
          timezone: z.string().optional().describe('Company timezone')
        })
        .optional()
        .describe('Company information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let usersResult = await client.getUsers({ userId: ctx.input.userId });
    let userData = Array.isArray(usersResult?.data)
      ? usersResult.data
      : usersResult?.data
        ? [usersResult.data]
        : [];

    let users = userData.map((u: any) => ({
      userId: String(u.user_id),
      email: u.email || undefined,
      firstName: u.first_name || undefined,
      lastName: u.last_name || undefined,
      avatar: u.avatar || undefined,
      dateCreated: u.date_created || undefined
    }));

    let teams: any[] | undefined;
    if (ctx.input.includeTeams) {
      let teamsResult = await client.getTeams();
      let teamData = Array.isArray(teamsResult?.data)
        ? teamsResult.data
        : teamsResult?.data
          ? [teamsResult.data]
          : [];
      teams = teamData.map((t: any) => ({
        teamId: String(t.team_id),
        teamName: t.team_name || '',
        color: t.color || undefined,
        users: t.users || undefined
      }));
    }

    let company: any;
    if (ctx.input.includeCompany) {
      let companyResult = await client.getCompany();
      let c = companyResult?.data?.[0] || companyResult?.data || companyResult;
      company = {
        companyId: String(c.company_id),
        companyName: c.company_name || '',
        domain: c.domain || undefined,
        currency: c.currency || undefined,
        timezone: c.timezone || undefined
      };
    }

    return {
      output: { users, teams, company },
      message: `Found **${users.length}** user(s)${teams ? ` and **${teams.length}** team(s)` : ''}.`
    };
  })
  .build();
