import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

let actionSchema = z.object({
  actionId: z.string().describe('Action ID'),
  type: z.string().describe('Action type (e.g. "createCard", "updateCard", "commentCard")'),
  date: z.string().describe('When the action occurred (ISO 8601)'),
  memberCreatorId: z.string().optional().describe('ID of the member who performed the action'),
  memberCreatorUsername: z.string().optional().describe('Username of the member'),
  actionData: z.any().optional().describe('Action-specific data')
});

export let getActivity = SlateTool.create(spec, {
  name: 'Get Activity',
  key: 'get_activity',
  description: `Retrieve the activity log (actions) for a board or card. Shows events like card creation, movement, comments, and member changes.`,
  instructions: [
    'Provide either boardId or cardId to scope the activity.',
    'Use filter to narrow to specific action types (e.g. "createCard", "commentCard", "updateCard").',
    'Use since/before for date-based filtering (ISO 8601 or action ID).'
  ],
  constraints: ['API limits action queries to 1000 at a time.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().optional().describe('Board ID to get activity for'),
      cardId: z.string().optional().describe('Card ID to get activity for'),
      filter: z
        .string()
        .optional()
        .describe('Comma-separated action types to filter by (e.g. "createCard,commentCard")'),
      limit: z
        .number()
        .optional()
        .describe('Max number of actions to return (default 50, max 1000)'),
      since: z
        .string()
        .optional()
        .describe('Only return actions after this date (ISO 8601) or action ID'),
      before: z
        .string()
        .optional()
        .describe('Only return actions before this date (ISO 8601) or action ID')
    })
  )
  .output(
    z.object({
      actions: z.array(actionSchema).describe('Activity actions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    let rawActions: any[];
    if (ctx.input.cardId) {
      rawActions = await client.getCardActions(ctx.input.cardId, {
        filter: ctx.input.filter,
        limit: ctx.input.limit
      });
    } else if (ctx.input.boardId) {
      rawActions = await client.getBoardActions(ctx.input.boardId, {
        filter: ctx.input.filter,
        limit: ctx.input.limit,
        since: ctx.input.since,
        before: ctx.input.before
      });
    } else {
      throw new Error('Either boardId or cardId must be provided');
    }

    let actions = rawActions.map((a: any) => ({
      actionId: a.id,
      type: a.type,
      date: a.date,
      memberCreatorId: a.idMemberCreator,
      memberCreatorUsername: a.memberCreator?.username,
      actionData: a.data
    }));

    return {
      output: { actions },
      message: `Found **${actions.length}** action(s).`
    };
  })
  .build();
