import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, responseList, validatePagination } from '../lib/response';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams & Teammates',
  key: 'list_teams',
  description: `List all teams and teammates in your Gist workspace. Returns team members, online status, and role information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional(),
      perPage: z.number().optional().describe('Results per page, at most 60'),
      includeTeammates: z
        .boolean()
        .optional()
        .describe('Also fetch teammates list (default: true)')
    })
  )
  .output(
    z.object({
      pages: z.any().optional(),
      rawResponse: z.any().optional().describe('Complete provider response data'),
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
    validatePagination({ page: ctx.input.page, perPage: ctx.input.perPage });
    let client = new GistClient({ token: ctx.auth.token });

    let teamsData = await client.listTeams({
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });
    let teams = responseList(teamsData.teams).map((t: any) => ({
      teamId: requiredId(t.id),
      teamName: t.name,
      createdAt: t.created_at !== undefined ? String(t.created_at) : undefined
    }));

    let teammates: any[] | undefined;
    if (ctx.input.includeTeammates !== false) {
      let teammatesData = await client.listTeammates({
        page: ctx.input.page,
        per_page: ctx.input.perPage
      });
      teammates = responseList(teammatesData.teammates).map((t: any) => ({
        teammateId: requiredId(t.id),
        name: t.name,
        email: t.email,
        avatar: t.avatar,
        role: t.role
      }));
    }

    return {
      output: { rawResponse: client.responses, teams, teammates, pages: teamsData.pages },
      message: `Found **${teams.length}** teams${teammates ? ` and **${teammates.length}** teammates` : ''}.`
    };
  })
  .build();
