import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let deleteSlackListItems = SlateTool.create(spec, {
  name: 'Delete Slack List Items',
  key: 'delete_slack_list_items',
  description:
    'Permanently delete one or more explicitly identified rows from a Slack List. Multi-item deletion is all-or-nothing: if Slack cannot delete every requested item, the batch fails.',
  instructions: [
    'Call list_slack_list_items first when you do not already have the exact item IDs.',
    'Provide every item to remove explicitly in itemIds. This tool does not accept filters or inferred targets.'
  ],
  constraints: [
    'Deletion is destructive and cannot be undone by this integration.',
    'A multi-item deletion is all-or-nothing; Slack rejects the batch instead of partially deleting it.',
    'Duplicate item IDs are rejected before the Slack API is called.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(slackActionScopes.listsWrite)
  .input(
    z.object({
      listId: z.string().trim().min(1).describe('Slack List ID'),
      itemIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .describe('Exact Slack List item IDs to delete')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Slack List ID'),
      itemIds: z.array(z.string()).describe('Exact item IDs deleted from the List'),
      deletedCount: z.number().int().positive().describe('Number of deleted List items'),
      deleted: z.boolean().describe('Whether Slack completed the deletion')
    })
  )
  .handleInvocation(async ctx => {
    let uniqueIds = new Set(ctx.input.itemIds);
    if (uniqueIds.size !== ctx.input.itemIds.length) {
      throw slackServiceError('itemIds must contain unique explicit Slack List item IDs');
    }

    await new SlackClient(ctx.auth.token).deleteSlackListItems(
      ctx.input.listId,
      ctx.input.itemIds
    );

    return {
      output: {
        listId: ctx.input.listId,
        itemIds: ctx.input.itemIds,
        deletedCount: ctx.input.itemIds.length,
        deleted: true
      },
      message:
        ctx.input.itemIds.length === 1
          ? `Deleted Slack List item \`${ctx.input.itemIds[0]}\` from List \`${ctx.input.listId}\`.`
          : `Deleted all ${ctx.input.itemIds.length} requested item(s) from Slack List \`${ctx.input.listId}\`.`
    };
  })
  .build();
