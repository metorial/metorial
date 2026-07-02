import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

let searchCardSchema = z.object({
  cardId: z.string().describe('Card ID'),
  name: z.string().describe('Card name'),
  description: z.string().optional().describe('Card description'),
  url: z.string().optional().describe('Card URL'),
  boardId: z.string().optional().describe('Board ID'),
  listId: z.string().optional().describe('List ID'),
  closed: z.boolean().optional().describe('Whether the card is archived')
});

let searchBoardSchema = z.object({
  boardId: z.string().describe('Board ID'),
  name: z.string().describe('Board name'),
  description: z.string().optional().describe('Board description'),
  url: z.string().optional().describe('Board URL'),
  closed: z.boolean().optional().describe('Whether the board is archived')
});

export let search = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across Trello boards and cards. Supports full-text search with optional filtering by board and model type.`,
  instructions: [
    'By default, searches both cards and boards.',
    'Use modelTypes to limit results to specific types (e.g. "cards" only).',
    'Use boardIds to restrict search to specific boards (comma-separated IDs).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query text'),
      modelTypes: z
        .string()
        .optional()
        .describe(
          'Comma-separated model types to search: "cards", "boards", "organizations", "members". Defaults to "cards,boards"'
        ),
      boardIds: z
        .string()
        .optional()
        .describe('Comma-separated board IDs to restrict search to'),
      cardsLimit: z
        .number()
        .optional()
        .describe('Max number of cards to return (default 10, max 1000)'),
      boardsLimit: z
        .number()
        .optional()
        .describe('Max number of boards to return (default 10)')
    })
  )
  .output(
    z.object({
      cards: z.array(searchCardSchema).optional().describe('Matching cards'),
      boards: z.array(searchBoardSchema).optional().describe('Matching boards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    let results = await client.search(ctx.input.query, {
      modelTypes: ctx.input.modelTypes,
      boardIds: ctx.input.boardIds,
      cardsLimit: ctx.input.cardsLimit,
      boardsLimit: ctx.input.boardsLimit
    });

    let cards = results.cards?.map((c: any) => ({
      cardId: c.id,
      name: c.name,
      description: c.desc || undefined,
      url: c.url,
      boardId: c.idBoard,
      listId: c.idList,
      closed: c.closed
    }));

    let boards = results.boards?.map((b: any) => ({
      boardId: b.id,
      name: b.name,
      description: b.desc || undefined,
      url: b.url,
      closed: b.closed
    }));

    let cardCount = cards?.length ?? 0;
    let boardCount = boards?.length ?? 0;

    return {
      output: {
        cards: cards?.length ? cards : undefined,
        boards: boards?.length ? boards : undefined
      },
      message: `Found **${cardCount}** card(s) and **${boardCount}** board(s) matching "${ctx.input.query}".`
    };
  })
  .build();
