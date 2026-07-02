import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let updateBoard = SlateTool.create(spec, {
  name: 'Update Board',
  key: 'update_board',
  description: `Updates a Miro board's name, description, or sharing/permissions policies.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to update'),
      name: z.string().optional().describe('New name for the board'),
      description: z.string().optional().describe('New description for the board'),
      sharingPolicy: z
        .object({
          access: z.string().optional(),
          inviteToAccountAndBoardLinkAccess: z.string().optional(),
          organizationAccess: z.string().optional(),
          teamAccess: z.string().optional()
        })
        .optional()
        .describe('Updated sharing policy'),
      permissionsPolicy: z
        .object({
          collaborationToolsStartAccess: z.string().optional(),
          copyAccess: z.string().optional(),
          sharingAccess: z.string().optional()
        })
        .optional()
        .describe('Updated permissions policy')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('ID of the updated board'),
      name: z.string().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      viewLink: z.string().optional().describe('Link to the board')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });

    let updateParams: any = {};
    if (ctx.input.name !== undefined) updateParams.name = ctx.input.name;
    if (ctx.input.description !== undefined) updateParams.description = ctx.input.description;
    if (ctx.input.sharingPolicy || ctx.input.permissionsPolicy) {
      updateParams.policy = {};
      if (ctx.input.sharingPolicy) updateParams.policy.sharingPolicy = ctx.input.sharingPolicy;
      if (ctx.input.permissionsPolicy)
        updateParams.policy.permissionsPolicy = ctx.input.permissionsPolicy;
    }

    let board = await client.updateBoard(ctx.input.boardId, updateParams);

    return {
      output: {
        boardId: board.id,
        name: board.name,
        description: board.description,
        viewLink: board.viewLink
      },
      message: `Updated board **${board.name}** (ID: ${board.id}).`
    };
  })
  .build();
