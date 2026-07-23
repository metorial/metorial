import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import type { SlackListItem } from '../lib/types';
import { spec } from '../spec';

let arbitraryObjectSchema = z.record(z.string(), z.unknown());

let slackListItemSchema = z.object({
  itemId: z.string().optional().describe('Stable Slack List item ID'),
  rowId: z.string().optional().describe('Stable row ID to use in update_slack_list_items'),
  fields: z
    .array(arbitraryObjectSchema)
    .optional()
    .describe('Typed field values returned by Slack'),
  cells: z
    .array(arbitraryObjectSchema)
    .optional()
    .describe('Typed cells, including column IDs, returned by Slack'),
  raw: arbitraryObjectSchema.describe('Complete List item returned by Slack')
});

let mapSlackListItem = (item: SlackListItem) => ({
  itemId: item.item_id ?? item.id ?? item.row_id,
  rowId: item.row_id ?? item.id ?? item.item_id,
  fields: item.fields,
  cells: item.cells,
  raw: item.raw ?? { ...item }
});

export let listSlackListItems = SlateTool.create(spec, {
  name: 'List Slack List Items',
  key: 'list_slack_list_items',
  description:
    'List and paginate rows in a Slack List, including the stable row and column identifiers needed for later updates or deletion.',
  instructions: [
    'Read List items before updating them so you can use the exact row_id and column_id values returned by Slack.',
    'Pass nextCursor into cursor to continue pagination.'
  ],
  constraints: ['Slack Lists are available only on supported paid workspace plans.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.listsRead)
  .input(
    z.object({
      listId: z.string().trim().min(1).describe('Slack List ID'),
      cursor: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Pagination cursor from a previous response'),
      limit: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Maximum number of List items to return')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Slack List ID'),
      items: z.array(slackListItemSchema).describe('Slack List rows and their typed cells'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new SlackClient(ctx.auth.token).listSlackListItems({
      listId: ctx.input.listId,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    return {
      output: {
        listId: ctx.input.listId,
        items: result.items.map(mapSlackListItem),
        nextCursor: result.nextCursor
      },
      message: `Found ${result.items.length} item(s) in Slack List \`${ctx.input.listId}\`.`
    };
  })
  .build();
