import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pinterestServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBoard = SlateTool.create(spec, {
  name: 'Manage Board',
  key: 'manage_board',
  description: `Get, create, update, or delete a Pinterest board. Use this to organize pins into themed collections. Supports public and secret board creation and modification.`,
  instructions: [
    'To get a board, provide the boardId and set action to "get".',
    'To create a board, provide a name and optionally a description and privacy setting.',
    'To update a board, provide the boardId along with the fields to update.',
    'To delete a board, provide the boardId and set action to "delete".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete'])
        .describe('Action to perform on the board'),
      boardId: z.string().optional().describe('Board ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Name of the board (required for create, optional for update)'),
      description: z.string().optional().describe('Description of the board'),
      privacy: z
        .enum(['PUBLIC', 'SECRET', 'PROTECTED'])
        .optional()
        .describe('Privacy setting for the board')
    })
  )
  .output(
    z.object({
      boardId: z.string().optional().describe('ID of the board'),
      name: z.string().optional().describe('Name of the board'),
      description: z.string().optional().describe('Description of the board'),
      privacy: z.string().optional().describe('Privacy setting'),
      pinCount: z.number().optional().describe('Number of pins on the board'),
      followerCount: z.number().optional().describe('Number of followers'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      deleted: z.boolean().optional().describe('Whether the board was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw pinterestServiceError('Board name is required for create action');
      }
      let result = await client.createBoard({
        name: ctx.input.name,
        description: ctx.input.description,
        privacy: ctx.input.privacy
      });

      return {
        output: {
          boardId: result.id,
          name: result.name,
          description: result.description,
          privacy: result.privacy,
          pinCount: result.pin_count,
          followerCount: result.follower_count,
          createdAt: result.created_at
        },
        message: `Created board **${result.name}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.boardId) {
        throw pinterestServiceError('Board ID is required for get action');
      }
      let result = await client.getBoard(ctx.input.boardId);

      return {
        output: {
          boardId: result.id,
          name: result.name,
          description: result.description,
          privacy: result.privacy,
          pinCount: result.pin_count,
          followerCount: result.follower_count,
          createdAt: result.created_at
        },
        message: `Retrieved board **${result.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.boardId) {
        throw pinterestServiceError('Board ID is required for update action');
      }
      let result = await client.updateBoard(ctx.input.boardId, {
        name: ctx.input.name,
        description: ctx.input.description,
        privacy: ctx.input.privacy
      });

      return {
        output: {
          boardId: result.id,
          name: result.name,
          description: result.description,
          privacy: result.privacy,
          pinCount: result.pin_count,
          followerCount: result.follower_count,
          createdAt: result.created_at
        },
        message: `Updated board **${result.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.boardId) {
        throw pinterestServiceError('Board ID is required for delete action');
      }
      await client.deleteBoard(ctx.input.boardId);

      return {
        output: {
          boardId: ctx.input.boardId,
          deleted: true
        },
        message: `Deleted board **${ctx.input.boardId}**.`
      };
    }

    throw pinterestServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
