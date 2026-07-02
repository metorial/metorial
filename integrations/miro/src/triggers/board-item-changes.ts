import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let boardItemChanges = SlateTrigger.create(spec, {
  name: 'Board Item Changes',
  key: 'board_item_changes',
  description:
    'Detects new or modified items on a Miro board by polling the board items endpoint. Emits events for items that have been created or updated since the last poll.',
  instructions: [
    'Provide a boardId to monitor. The trigger polls for items and detects changes via modifiedAt timestamps.',
    'On first run, all existing items are captured as the baseline — no events are emitted.',
    'Subsequent polls emit events for new items (item.created) and items whose modifiedAt changed (item.updated).'
  ]
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the item was created or updated'),
      itemId: z.string().describe('ID of the changed item'),
      itemType: z.string().describe('Type of the item'),
      boardId: z.string().describe('Board the item belongs to'),
      content: z.string().optional().describe('Text content of the item'),
      title: z.string().optional().describe('Title of the item'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the affected item'),
      itemType: z.string().describe('Type of the item (sticky_note, card, text, shape, etc.)'),
      boardId: z.string().describe('Board ID the item belongs to'),
      content: z.string().optional().describe('Text content of the item'),
      title: z.string().optional().describe('Title of the item'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      position: z
        .object({
          x: z.number().optional(),
          y: z.number().optional()
        })
        .optional()
        .describe('Position on the board')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MiroClient({ token: ctx.auth.token });

      let state = ctx.state || {};
      let boardId = state.boardId as string | undefined;

      if (!boardId) {
        // No boardId stored yet — fetch the first available board
        let boardsResult = await client.getBoards({ limit: 1 });
        let boards = boardsResult.data || [];
        if (boards.length === 0) {
          return { inputs: [], updatedState: state };
        }
        boardId = boards[0].id;
        state.boardId = boardId;
      }

      let knownItems: Record<string, string> =
        (state.knownItems as Record<string, string>) || {};
      let isFirstRun = state.initialized !== true;

      // Fetch all items with pagination
      let allItems: any[] = [];
      let cursor: string | undefined;

      do {
        let result = await client.getItems(boardId!, { limit: 50, cursor });
        let items = result.data || [];
        allItems.push(...items);
        cursor = result.cursor;
      } while (cursor);

      let inputs: Array<{
        eventType: 'created' | 'updated';
        itemId: string;
        itemType: string;
        boardId: string;
        content?: string;
        title?: string;
        modifiedAt?: string;
      }> = [];

      let newKnownItems: Record<string, string> = {};

      for (let item of allItems) {
        let itemId = item.id;
        let modifiedAt = item.modifiedAt || '';
        newKnownItems[itemId] = modifiedAt;

        if (isFirstRun) continue;

        if (!knownItems[itemId]) {
          inputs.push({
            eventType: 'created',
            itemId,
            itemType: item.type || 'unknown',
            boardId: boardId!,
            content: item.data?.content,
            title: item.data?.title,
            modifiedAt
          });
        } else if (knownItems[itemId] !== modifiedAt) {
          inputs.push({
            eventType: 'updated',
            itemId,
            itemType: item.type || 'unknown',
            boardId: boardId!,
            content: item.data?.content,
            title: item.data?.title,
            modifiedAt
          });
        }
      }

      return {
        inputs,
        updatedState: {
          ...state,
          knownItems: newKnownItems,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `item.${ctx.input.eventType}`,
        id: `${ctx.input.itemId}-${ctx.input.modifiedAt || ctx.input.eventType}`,
        output: {
          itemId: ctx.input.itemId,
          itemType: ctx.input.itemType,
          boardId: ctx.input.boardId,
          content: ctx.input.content,
          title: ctx.input.title,
          modifiedAt: ctx.input.modifiedAt,
          position: undefined
        }
      };
    }
  })
  .build();
