import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams & Teammates',
  key: 'list_teams',
  description: `List all teams and teammates in your Gist workspace. Returns team members, online status, and role information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      includeTeammates: z
        .boolean()
        .optional()
        .describe('Also fetch teammates list (default: true)')
    })
  )
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.string(),
          teamName: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      teammates: z
        .array(
          z.object({
            teammateId: z.string(),
            name: z.string().optional(),
            email: z.string().optional(),
            avatar: z.string().optional(),
            role: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let teamsData = await client.listTeams();
    let teams = (teamsData.teams || []).map((t: any) => ({
      teamId: String(t.id),
      teamName: t.name,
      createdAt: t.created_at ? String(t.created_at) : undefined
    }));

    let teammates: any[] | undefined;
    if (ctx.input.includeTeammates !== false) {
      let teammatesData = await client.listTeammates();
      teammates = (teammatesData.teammates || []).map((t: any) => ({
        teammateId: String(t.id),
        name: t.name,
        email: t.email,
        avatar: t.avatar,
        role: t.role
      }));
    }

    return {
      output: { teams, teammates },
      message: `Found **${teams.length}** teams${teammates ? ` and **${teammates.length}** teammates` : ''}.`
    };
  })
  .build();
