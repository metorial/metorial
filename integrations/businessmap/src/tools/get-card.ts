import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCardTool = SlateTool.create(spec, {
  name: 'Get Card',
  key: 'get_card',
  description: `Retrieve full details of a specific card, including its properties, custom fields, subtasks, comments, and tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cardId: z.number().describe('The ID of the card to retrieve'),
      includeSubtasks: z
        .boolean()
        .optional()
        .describe('Whether to include subtasks. Defaults to false.'),
      includeComments: z
        .boolean()
        .optional()
        .describe('Whether to include comments. Defaults to false.')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('Card ID'),
      customId: z.string().optional().nullable().describe('Custom card ID'),
      boardId: z.number().optional().describe('Board ID'),
      workflowId: z.number().optional().describe('Workflow ID'),
      columnId: z.number().optional().describe('Column ID'),
      laneId: z.number().optional().describe('Lane ID'),
      title: z.string().optional().describe('Card title'),
      description: z.string().optional().nullable().describe('Card description'),
      ownerUserId: z.number().optional().nullable().describe('Owner user ID'),
      typeId: z.number().optional().nullable().describe('Card type ID'),
      color: z.string().optional().nullable().describe('Card color'),
      priority: z.number().optional().nullable().describe('Card priority'),
      size: z.number().optional().nullable().describe('Card size'),
      deadline: z.string().optional().nullable().describe('Card deadline'),
      section: z.number().optional().describe('Section (1=Backlog, 2=In Progress, 3=Done)'),
      position: z.number().optional().describe('Position in column'),
      isBlocked: z.number().optional().describe('Whether the card is blocked (0 or 1)'),
      createdAt: z.string().optional().nullable().describe('Card creation timestamp'),
      lastModified: z.string().optional().nullable().describe('Last modification timestamp'),
      customFields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            name: z.string().optional().describe('Field name'),
            value: z.any().optional().nullable().describe('Field value')
          })
        )
        .optional()
        .describe('Custom fields on the card'),
      subtasks: z
        .array(
          z.object({
            subtaskId: z.number().describe('Subtask ID'),
            description: z.string().optional().describe('Subtask description'),
            ownerUserId: z.number().optional().nullable().describe('Subtask assignee'),
            isFinished: z
              .number()
              .optional()
              .describe('Whether the subtask is finished (0 or 1)')
          })
        )
        .optional()
        .describe('Card subtasks'),
      comments: z
        .array(
          z.object({
            commentId: z.number().describe('Comment ID'),
            text: z.string().optional().describe('Comment text'),
            authorUserId: z.number().optional().describe('Author user ID'),
            createdAt: z.string().optional().nullable().describe('Comment creation timestamp')
          })
        )
        .optional()
        .describe('Card comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let card = await client.getCard(ctx.input.cardId);

    let subtasks: any[] | undefined;
    let comments: any[] | undefined;

    let promises: Promise<void>[] = [];

    if (ctx.input.includeSubtasks) {
      promises.push(
        client.listSubtasks(ctx.input.cardId).then(s => {
          subtasks = s;
        })
      );
    }

    if (ctx.input.includeComments) {
      promises.push(
        client.listComments(ctx.input.cardId).then(c => {
          comments = c;
        })
      );
    }

    await Promise.all(promises);

    return {
      output: {
        cardId: card.card_id,
        customId: card.custom_id,
        boardId: card.board_id,
        workflowId: card.workflow_id,
        columnId: card.column_id,
        laneId: card.lane_id,
        title: card.title,
        description: card.description,
        ownerUserId: card.owner_user_id,
        typeId: card.type_id,
        color: card.color,
        priority: card.priority,
        size: card.size,
        deadline: card.deadline,
        section: card.section,
        position: card.position,
        isBlocked: card.is_blocked,
        createdAt: card.created_at,
        lastModified: card.last_modified,
        customFields: card.custom_fields?.map((f: any) => ({
          fieldId: f.field_id,
          name: f.name,
          value: f.value
        })),
        subtasks: subtasks?.map((s: any) => ({
          subtaskId: s.subtask_id,
          description: s.description,
          ownerUserId: s.owner_user_id,
          isFinished: s.is_finished
        })),
        comments: comments?.map((c: any) => ({
          commentId: c.comment_id,
          text: c.text,
          authorUserId: c.author_user_id ?? c.user_id,
          createdAt: c.created_at
        }))
      },
      message: `Retrieved card **${card.title ?? ctx.input.cardId}** (ID: ${card.card_id}).`
    };
  })
  .build();
