import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let getBoard = SlateTool.create(spec, {
  name: 'Get Board',
  key: 'get_board',
  description: `Retrieves detailed information about a specific Miro board by its ID, including its name, description, sharing policies, owner, and team info.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to retrieve')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('ID of the board'),
      name: z.string().describe('Name of the board'),
      description: z.string().optional().describe('Description of the board'),
      viewLink: z.string().optional().describe('Link to view the board'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      owner: z
        .object({
          userId: z.string().optional(),
          name: z.string().optional()
        })
        .optional()
        .describe('Board owner info'),
      team: z
        .object({
          teamId: z.string().optional(),
          name: z.string().optional()
        })
        .optional()
        .describe('Team the board belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    let board = await client.getBoard(ctx.input.boardId);

    return {
      output: {
        boardId: board.id,
        name: board.name,
        description: board.description,
        viewLink: board.viewLink,
        createdAt: board.createdAt,
        modifiedAt: board.modifiedAt,
        owner: board.owner
          ? {
              userId: board.owner.id?.toString(),
              name: board.owner.name
            }
          : undefined,
        team: board.team
          ? {
              teamId: board.team.id?.toString(),
              name: board.team.name
            }
          : undefined
      },
      message: `Retrieved board **${board.name}** (ID: ${board.id}).${board.viewLink ? ` [Open board](${board.viewLink})` : ''}`
    };
  })
  .build();
