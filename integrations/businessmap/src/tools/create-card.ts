import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCardTool = SlateTool.create(spec, {
  name: 'Create Card',
  key: 'create_card',
  description: `Create a new card on a Kanbanize board. Requires board, workflow, column, and lane placement. Optionally set properties like description, owner, priority, size, color, deadline, and card type.`,
  instructions: [
    'Use "Get Board Details" first to find valid workflow, column, and lane IDs for the target board.'
  ]
})
  .input(
    z.object({
      boardId: z.number().describe('Board ID to create the card on'),
      workflowId: z.number().describe('Workflow ID to place the card in'),
      columnId: z.number().describe('Column ID to place the card in'),
      laneId: z.number().describe('Lane ID to place the card in'),
      title: z.string().describe('Card title'),
      description: z.string().optional().describe('Card description (supports HTML)'),
      customId: z.string().optional().describe('Custom card identifier'),
      ownerUserId: z.number().optional().describe('User ID of the card owner'),
      typeId: z.number().optional().describe('Card type ID'),
      size: z.number().optional().describe('Card size estimate'),
      priority: z
        .number()
        .optional()
        .describe('Card priority (0=None, 1=Low, 2=Average, 3=High, 4=Critical)'),
      color: z.string().optional().describe('Card color as hex code (e.g. "#ff0000")'),
      deadline: z.string().optional().describe('Deadline in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('ID of the newly created card'),
      boardId: z.number().optional().describe('Board ID'),
      title: z.string().optional().describe('Card title'),
      columnId: z.number().optional().describe('Column ID'),
      laneId: z.number().optional().describe('Lane ID'),
      workflowId: z.number().optional().describe('Workflow ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let card = await client.createCard({
      boardId: ctx.input.boardId,
      workflowId: ctx.input.workflowId,
      columnId: ctx.input.columnId,
      laneId: ctx.input.laneId,
      title: ctx.input.title,
      description: ctx.input.description,
      customId: ctx.input.customId,
      ownerUserId: ctx.input.ownerUserId,
      typeId: ctx.input.typeId,
      size: ctx.input.size,
      priority: ctx.input.priority,
      color: ctx.input.color,
      deadline: ctx.input.deadline
    });

    return {
      output: {
        cardId: card.card_id,
        boardId: card.board_id,
        title: card.title,
        columnId: card.column_id,
        laneId: card.lane_id,
        workflowId: card.workflow_id
      },
      message: `Created card **${ctx.input.title}** (ID: ${card.card_id}) on board ${ctx.input.boardId}.`
    };
  })
  .build();
