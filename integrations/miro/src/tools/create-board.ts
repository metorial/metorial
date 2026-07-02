import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let createBoard = SlateTool.create(spec, {
  name: 'Create Board',
  key: 'create_board',
  description: `Creates a new Miro board. Optionally configure sharing and permissions policies. The board can be assigned to a specific team.`,
  constraints: ['Free plans allow up to 3 team boards.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the board'),
      description: z.string().optional().describe('Description of the board'),
      teamId: z.string().optional().describe('Team ID to create the board in'),
      sharingPolicy: z
        .object({
          access: z
            .string()
            .optional()
            .describe('Board access level (e.g., "private", "view", "comment", "edit")'),
          inviteToAccountAndBoardLinkAccess: z
            .string()
            .optional()
            .describe('Access for users invited via link'),
          organizationAccess: z.string().optional().describe('Organization-level access'),
          teamAccess: z.string().optional().describe('Team-level access')
        })
        .optional()
        .describe('Sharing policy for the board'),
      permissionsPolicy: z
        .object({
          collaborationToolsStartAccess: z
            .string()
            .optional()
            .describe('Who can start collaboration tools'),
          copyAccess: z.string().optional().describe('Who can copy the board'),
          sharingAccess: z.string().optional().describe('Who can share the board')
        })
        .optional()
        .describe('Permissions policy for the board')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('ID of the created board'),
      name: z.string().describe('Name of the board'),
      description: z.string().optional().describe('Description of the board'),
      viewLink: z.string().optional().describe('Link to view the board'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });

    let policy: any;
    if (ctx.input.sharingPolicy || ctx.input.permissionsPolicy) {
      policy = {};
      if (ctx.input.sharingPolicy) policy.sharingPolicy = ctx.input.sharingPolicy;
      if (ctx.input.permissionsPolicy) policy.permissionsPolicy = ctx.input.permissionsPolicy;
    }

    let board = await client.createBoard({
      name: ctx.input.name,
      description: ctx.input.description,
      teamId: ctx.input.teamId,
      policy
    });

    return {
      output: {
        boardId: board.id,
        name: board.name,
        description: board.description,
        viewLink: board.viewLink,
        createdAt: board.createdAt
      },
      message: `Created board **${board.name}** (ID: ${board.id}).${board.viewLink ? ` [Open board](${board.viewLink})` : ''}`
    };
  })
  .build();
