import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { teamSchema, userSchema } from '../lib/types';
import { spec } from '../spec';

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents and Teams',
  key: 'list_agents',
  description: `Retrieve agents (users) and/or teams from the SupportBee account. Useful for finding user IDs and team IDs needed for ticket assignment and other operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeUsers: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include agents/users in the response'),
      includeTeams: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include teams in the response'),
      withInvited: z.boolean().optional().describe('Include invited (unconfirmed) users'),
      roles: z
        .string()
        .optional()
        .describe(
          'Filter users by role (comma-separated: admin, agent, collaborator, customer)'
        )
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).optional().describe('List of agents/users'),
      teams: z.array(teamSchema).optional().describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let users: any;
    let teams: any;

    if (ctx.input.includeUsers) {
      users = await client.listUsers({
        withInvited: ctx.input.withInvited,
        withRoles: ctx.input.roles
      });
    }

    if (ctx.input.includeTeams) {
      teams = await client.listTeams();
    }

    let messageParts: string[] = [];
    if (users) messageParts.push(`**${users.length}** users`);
    if (teams) messageParts.push(`**${teams.length}** teams`);

    return {
      output: { users, teams },
      message: `Retrieved ${messageParts.join(' and ')}`
    };
  })
  .build();
