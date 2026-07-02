import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCardsTool = SlateTool.create(spec, {
  name: 'List Cards',
  key: 'list_cards',
  description: `List and filter cards across one or more boards. Supports filtering by board, column, lane, workflow, owner, and card type. Returns paginated results with up to 200 cards per page.`,
  instructions: [
    'Use boardIds to scope results to specific boards.',
    'Use page parameter to navigate through large result sets (200 cards per page).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardIds: z.array(z.number()).optional().describe('Filter by specific board IDs'),
      columnId: z.number().optional().describe('Filter by column ID'),
      laneId: z.number().optional().describe('Filter by lane ID'),
      workflowId: z.number().optional().describe('Filter by workflow ID'),
      ownerId: z.number().optional().describe('Filter by owner user ID'),
      typeId: z.number().optional().describe('Filter by card type ID'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Whether to include archived cards. Defaults to false.'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      cards: z
        .array(
          z.object({
            cardId: z.number().describe('Card ID'),
            customId: z.string().optional().nullable().describe('Custom card ID'),
            boardId: z.number().optional().describe('Board ID'),
            workflowId: z.number().optional().describe('Workflow ID'),
            columnId: z.number().optional().describe('Column ID'),
            laneId: z.number().optional().describe('Lane ID'),
            title: z.string().optional().describe('Card title'),
            ownerUserId: z.number().optional().nullable().describe('Owner user ID'),
            typeId: z.number().optional().nullable().describe('Card type ID'),
            color: z.string().optional().nullable().describe('Card color'),
            priority: z.number().optional().nullable().describe('Card priority'),
            size: z.number().optional().nullable().describe('Card size'),
            deadline: z.string().optional().nullable().describe('Card deadline'),
            section: z
              .number()
              .optional()
              .describe('Section (1=Backlog, 2=In Progress, 3=Done)')
          })
        )
        .describe('List of cards'),
      totalPages: z.number().optional().describe('Total number of pages'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let result = await client.listCards({
      boardIds: ctx.input.boardIds,
      columnId: ctx.input.columnId,
      laneId: ctx.input.laneId,
      workflowId: ctx.input.workflowId,
      ownerId: ctx.input.ownerId,
      typeId: ctx.input.typeId,
      isArchived: ctx.input.includeArchived ? undefined : 0,
      page: ctx.input.page
    });

    let cards = result?.data ?? [];
    let pagination = result?.pagination;

    return {
      output: {
        cards: cards.map((c: any) => ({
          cardId: c.card_id,
          customId: c.custom_id,
          boardId: c.board_id,
          workflowId: c.workflow_id,
          columnId: c.column_id,
          laneId: c.lane_id,
          title: c.title,
          ownerUserId: c.owner_user_id,
          typeId: c.type_id,
          color: c.color,
          priority: c.priority,
          size: c.size,
          deadline: c.deadline,
          section: c.section
        })),
        totalPages: pagination?.all_pages,
        currentPage: pagination?.current_page
      },
      message: `Found **${cards.length}** card(s)${pagination ? ` (page ${pagination.current_page} of ${pagination.all_pages})` : ''}.`
    };
  })
  .build();
