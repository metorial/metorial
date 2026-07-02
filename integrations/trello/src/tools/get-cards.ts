import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { trelloServiceError } from '../lib/errors';
import { spec } from '../spec';

let cardSummarySchema = z.object({
  cardId: z.string().describe('Unique card ID'),
  name: z.string().describe('Card name'),
  description: z.string().optional().describe('Card description'),
  closed: z.boolean().describe('Whether the card is archived'),
  url: z.string().optional().describe('Full URL to the card'),
  boardId: z.string().describe('ID of the board'),
  listId: z.string().describe('ID of the list the card is in'),
  memberIds: z.array(z.string()).optional().describe('IDs of assigned members'),
  labelIds: z.array(z.string()).optional().describe('IDs of applied labels'),
  due: z.string().optional().describe('Due date (ISO 8601)'),
  dueComplete: z.boolean().optional().describe('Whether the due date is marked complete'),
  start: z.string().optional().describe('Start date (ISO 8601)')
});

export let getCards = SlateTool.create(spec, {
  name: 'Get Cards',
  key: 'get_cards',
  description: `Get cards from a specific list or an entire board. Returns card summaries including names, descriptions, due dates, and assigned members.`,
  instructions: [
    'Provide either a listId to get cards from a single list, or a boardId to get all cards on the board.',
    'If both are provided, listId takes precedence.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().optional().describe('List ID to get cards from'),
      boardId: z.string().optional().describe('Board ID to get all cards from'),
      filter: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe(
          'Filter cards by status (only applies when using boardId). Defaults to "open"'
        )
    })
  )
  .output(
    z.object({
      cards: z.array(cardSummarySchema).describe('List of cards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    let rawCards: any[];
    if (ctx.input.listId) {
      rawCards = await client.getCards(ctx.input.listId);
    } else if (ctx.input.boardId) {
      rawCards = await client.getBoardCards(ctx.input.boardId, ctx.input.filter);
    } else {
      throw trelloServiceError('Either listId or boardId must be provided.');
    }

    let cards = rawCards.map((c: any) => ({
      cardId: c.id,
      name: c.name,
      description: c.desc || undefined,
      closed: c.closed ?? false,
      url: c.url,
      boardId: c.idBoard,
      listId: c.idList,
      memberIds: c.idMembers?.length ? c.idMembers : undefined,
      labelIds: c.idLabels?.length ? c.idLabels : undefined,
      due: c.due || undefined,
      dueComplete: c.dueComplete,
      start: c.start || undefined
    }));

    return {
      output: { cards },
      message: `Found **${cards.length}** card(s).`
    };
  })
  .build();
