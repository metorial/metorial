import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let getTeamInfo = SlateTool.create(spec, {
  name: 'Get Team Info',
  key: 'get_team_info',
  description: `Retrieve information about the Slack workspace (team), including its name, domain, email domain, and icon.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.teamInfo)
  .input(z.object({}))
  .output(
    z.object({
      teamId: z.string().describe('Workspace team ID'),
      name: z.string().optional().describe('Workspace name'),
      domain: z.string().optional().describe('Workspace URL domain (e.g. "myworkspace")'),
      emailDomain: z.string().optional().describe('Email domain for the workspace'),
      iconUrl: z.string().optional().describe('Workspace icon URL'),
      enterpriseId: z
        .string()
        .optional()
        .describe('Enterprise Grid organization ID if applicable'),
      enterpriseName: z.string().optional().describe('Enterprise Grid organization name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let team = await client.getTeamInfo();

    return {
      output: {
        teamId: team.id,
        name: team.name,
        domain: team.domain,
        emailDomain: team.email_domain,
        iconUrl: team.icon?.image_132 || team.icon?.image_230,
        enterpriseId: team.enterprise_id,
        enterpriseName: team.enterprise_name
      },
      message: `Workspace: **${team.name}** (\`${team.domain}.slack.com\`).`
    };
  })
  .build();
