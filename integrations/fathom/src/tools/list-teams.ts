import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamMemberSchema = z.object({
  name: z.string().describe('Name of the team member'),
  email: z.string().describe('Email address of the team member'),
  createdAt: z.string().describe('When the member was added (ISO 8601)')
});

let teamSchema = z.object({
  teamName: z.string().describe('Name of the team'),
  createdAt: z.string().describe('When the team was created (ISO 8601)'),
  members: z
    .array(teamMemberSchema)
    .optional()
    .describe('Members of the team (only included when includeMembers is true)')
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List teams accessible to the authenticated user. Optionally includes team members for each team. Use this to discover team names for filtering meetings or managing team data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeMembers: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch team members for each team')
    })
  )
  .output(
    z.object({
      teams: z.array(teamSchema).describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // Fetch all teams with pagination
    let allTeams: Array<{ name: string; created_at: string }> = [];
    let cursor: string | undefined;

    do {
      let result = await client.listTeams(cursor);
      allTeams.push(...result.items);
      cursor = result.next_cursor || undefined;
    } while (cursor);

    let teams: z.infer<typeof teamSchema>[] = [];

    for (let team of allTeams) {
      let teamEntry: z.infer<typeof teamSchema> = {
        teamName: team.name,
        createdAt: team.created_at
      };

      if (ctx.input.includeMembers) {
        let allMembers: Array<{ name: string; email: string; created_at: string }> = [];
        let memberCursor: string | undefined;

        do {
          let membersResult = await client.listTeamMembers(team.name, memberCursor);
          allMembers.push(...membersResult.items);
          memberCursor = membersResult.next_cursor || undefined;
        } while (memberCursor);

        teamEntry.members = allMembers.map(m => ({
          name: m.name,
          email: m.email,
          createdAt: m.created_at
        }));
      }

      teams.push(teamEntry);
    }

    let memberCount = teams.reduce((sum, t) => sum + (t.members?.length || 0), 0);

    return {
      output: { teams },
      message: ctx.input.includeMembers
        ? `Found **${teams.length}** team(s) with **${memberCount}** total member(s).`
        : `Found **${teams.length}** team(s).`
    };
  })
  .build();
