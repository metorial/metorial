import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let copyBoard = SlateTool.create(spec, {
  name: 'Copy Board',
  key: 'copy_board',
  description: `Creates a copy of an existing Miro board. Optionally set a new name, description, or target team for the copy.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to copy'),
      name: z.string().optional().describe('Name for the copied board'),
      description: z.string().optional().describe('Description for the copied board'),
      teamId: z.string().optional().describe('Team ID to place the copied board in')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('ID of the new copied board'),
      name: z.string().describe('Name of the copied board'),
      viewLink: z.string().optional().describe('Link to the new board')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    let board = await client.copyBoard(ctx.input.boardId, {
      name: ctx.input.name,
      description: ctx.input.description,
      teamId: ctx.input.teamId
    });

    return {
      output: {
        boardId: board.id,
        name: board.name,
        viewLink: board.viewLink
      },
      message: `Copied board to **${board.name}** (ID: ${board.id}).${board.viewLink ? ` [Open board](${board.viewLink})` : ''}`
    };
  })
  .build();
