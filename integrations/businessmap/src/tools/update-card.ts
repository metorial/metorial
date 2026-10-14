import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCardTool = SlateTool.create(spec, {
  name: 'Update Card',
  key: 'update_card',
  description: `Update an existing card's properties. This covers editing card details (title, description, priority, etc.) as well as moving a card to a different column, lane, workflow, or board. Only provide the fields you want to change.`,
  instructions: [
    'To move a card to a new column, set columnId. To move across boards, set boardId along with the target workflowId, columnId, and laneId.'
  ]
})
  .input(
    z.object({
      cardId: z.number().describe('ID of the card to update'),
      title: z.string().optional().describe('New card title'),
      description: z.string().optional().describe('New card description (supports HTML)'),
      ownerUserId: z
        .number()
        .optional()
        .describe('New owner user ID. Call list_users to discover users.'),
      typeId: z
        .number()
        .optional()
        .describe('New card type ID. Call list_card_types to discover valid types.'),
      size: z.number().optional().describe('New card size estimate'),
      priority: z
        .number()
        .optional()
        .describe(
          'New priority (1=Critical, 2=High, 3=Average, 4=Low; values above 4 are treated as Low)'
        ),
      color: z.string().optional().describe('New card color as hex code'),
      deadline: z
        .string()
        .optional()
        .describe('New deadline as an ISO 8601 datetime including a timezone offset'),
      columnId: z.number().optional().describe('Move to this column ID'),
      laneId: z.number().optional().describe('Move to this lane ID'),
      workflowId: z.number().optional().describe('Move to this workflow ID'),
      boardId: z.number().optional().describe('Move to this board ID'),
      position: z.number().optional().describe('New position within the column/lane')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('Updated card ID'),
      title: z.string().optional().describe('Card title'),
      boardId: z.number().optional().describe('Board ID'),
      columnId: z.number().optional().describe('Column ID'),
      laneId: z.number().optional().describe('Lane ID'),
      workflowId: z.number().optional().describe('Workflow ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let { cardId, ...updateData } = ctx.input;
    let card = await client.updateCard(cardId, updateData);

    return {
      output: {
        cardId: card?.card_id ?? cardId,
        title: card?.title,
        boardId: card?.board_id,
        columnId: card?.column_id,
        laneId: card?.lane_id,
        workflowId: card?.workflow_id
      },
      message: `Updated card **${card?.title ?? cardId}**.`
    };
  })
  .build();
