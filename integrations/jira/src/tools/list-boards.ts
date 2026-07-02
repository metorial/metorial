import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let listBoardsTool = SlateTool.create(spec, {
  name: 'List Boards',
  key: 'list_boards',
  description: `List Jira boards (Scrum or Kanban). Optionally filter by board type or project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectKeyOrId: z.string().optional().describe('Filter boards by project key or ID.'),
      type: z
        .enum(['scrum', 'kanban', 'simple'])
        .optional()
        .describe('Filter boards by type.'),
      startAt: z.number().optional().default(0).describe('Pagination start index.'),
      maxResults: z.number().optional().default(50).describe('Maximum boards to return.')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching boards.'),
      boards: z.array(
        z.object({
          boardId: z.number().describe('The board ID.'),
          name: z.string().describe('The board name.'),
          type: z.string().describe('The board type (scrum, kanban, simple).'),
          projectKey: z
            .string()
            .optional()
            .describe('The project key associated with the board.'),
          projectName: z
            .string()
            .optional()
            .describe('The project name associated with the board.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let result = await client.getBoards({
      projectKeyOrId: ctx.input.projectKeyOrId,
      type: ctx.input.type,
      startAt: ctx.input.startAt,
      maxResults: ctx.input.maxResults
    });

    let boards = (result.values ?? []).map((b: any) => ({
      boardId: b.id,
      name: b.name,
      type: b.type,
      projectKey: b.location?.projectKey,
      projectName: b.location?.projectName
    }));

    return {
      output: {
        total: result.total ?? boards.length,
        boards
      },
      message: `Found **${result.total ?? boards.length}** boards. Returned ${boards.length}.`
    };
  })
  .build();
