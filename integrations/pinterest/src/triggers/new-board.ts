import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newBoard = SlateTrigger.create(spec, {
  name: 'New Board',
  key: 'new_board',
  description:
    'Triggers when a new board is created by the authenticated user. Polls for boards and detects newly created ones since the last check.'
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      name: z.string().optional().describe('Name of the board'),
      description: z.string().optional().describe('Description of the board'),
      privacy: z.string().optional().describe('Privacy setting'),
      pinCount: z.number().optional().describe('Number of pins'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('ID of the new board'),
      name: z.string().optional().describe('Name of the board'),
      description: z.string().optional().describe('Description of the board'),
      privacy: z.string().optional().describe('Privacy setting (PUBLIC, SECRET, PROTECTED)'),
      pinCount: z.number().optional().describe('Number of pins on the board'),
      createdAt: z.string().optional().describe('Timestamp when the board was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.listBoards({
        pageSize: 50
      });

      let knownBoardIds: string[] = ctx.state?.knownBoardIds || [];
      let allBoardIds: string[] = [];
      let newBoards: any[] = [];

      for (let board of result.items || []) {
        allBoardIds.push(board.id);
        if (knownBoardIds.length > 0 && !knownBoardIds.includes(board.id)) {
          newBoards.push(board);
        }
      }

      if (knownBoardIds.length === 0) {
        return {
          inputs: [],
          updatedState: {
            knownBoardIds: allBoardIds
          }
        };
      }

      return {
        inputs: newBoards.map(board => ({
          boardId: board.id,
          name: board.name,
          description: board.description,
          privacy: board.privacy,
          pinCount: board.pin_count,
          createdAt: board.created_at
        })),
        updatedState: {
          knownBoardIds: allBoardIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'board.created',
        id: ctx.input.boardId,
        output: {
          boardId: ctx.input.boardId,
          name: ctx.input.name,
          description: ctx.input.description,
          privacy: ctx.input.privacy,
          pinCount: ctx.input.pinCount,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
