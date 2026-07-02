import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamSchema = z.object({
  teamId: z.string().describe('Unique ID of the team'),
  name: z.string().describe('Name of the team'),
  isDefault: z.boolean().optional().describe('Whether this is the default team'),
  createdAt: z.string().optional().describe('When the team was created'),
  membersCount: z.number().optional().describe('Number of team members'),
  projectsCount: z.number().optional().describe('Number of projects in the team'),
  filesCount: z.number().optional().describe('Number of files in the team')
});

export let listTeamsTool = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams the current user belongs to, including owned teams and teams they've been invited to. Includes team metadata and member counts.`,
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
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let teams = await client.getTeams();

    let mappedTeams = teams.map((t: any) => ({
      teamId: t.id,
      name: t.name,
      isDefault: t['is-default'] ?? t.isDefault,
      createdAt: t['created-at'] ?? t.createdAt,
      membersCount: t['members-count'] ?? t.membersCount,
      projectsCount: t['projects-count'] ?? t.projectsCount,
      filesCount: t['files-count'] ?? t.filesCount
    }));

    return {
      output: { teams: mappedTeams },
      message: `Found **${mappedTeams.length}** team(s).`
    };
  })
  .build();
