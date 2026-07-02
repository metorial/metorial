import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Lists all teams (called "groups" in the API) in the workspace. Use this to look up team UUIDs for assigning stories, epics, or iterations to teams.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('UUID of the team'),
            name: z.string().describe('Team name'),
            mentionName: z.string().describe('Mention handle'),
            description: z.string().describe('Team description'),
            memberIds: z.array(z.string()).describe('UUIDs of team members'),
            workflowIds: z
              .array(z.number())
              .describe('IDs of workflows associated with this team'),
            archived: z.boolean().describe('Whether the team is archived')
          })
        )
        .describe('List of all teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let groups = await client.listGroups();

    let mapped = groups.map((g: any) => ({
      teamId: g.id,
      name: g.name,
      mentionName: g.mention_name || '',
      description: g.description || '',
      memberIds: g.member_ids || [],
      workflowIds: g.workflow_ids || [],
      archived: g.archived ?? false
    }));

    return {
      output: { teams: mapped },
      message: `Found **${mapped.length}** teams`
    };
  })
  .build();
