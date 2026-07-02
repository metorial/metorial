import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { crispServiceError } from '../lib/errors';
import { spec } from '../spec';

export let batchConversationActions = SlateTool.create(spec, {
  name: 'Batch Conversation Actions',
  key: 'batch_conversation_actions',
  description: `Perform bulk actions on multiple conversations at once. Resolve, mark as read, or remove multiple conversations in a single operation.`,
  instructions: [
    'Provide an array of session IDs and choose one action to apply to all of them.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sessionIds: z.array(z.string()).describe('List of conversation session IDs'),
      action: z
        .enum(['resolve', 'read', 'remove'])
        .describe('Action to perform: resolve, read, or remove')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed'),
      count: z.number().describe('Number of conversations affected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });

    if (ctx.input.sessionIds.length === 0) {
      throw crispServiceError('Provide at least one conversation session ID.');
    }

    if (ctx.input.action === 'resolve') {
      await client.batchResolveConversations(ctx.input.sessionIds);
    } else if (ctx.input.action === 'read') {
      await client.batchReadConversations(ctx.input.sessionIds);
    } else {
      await client.batchRemoveConversations(ctx.input.sessionIds);
    }

    return {
      output: {
        action: ctx.input.action,
        count: ctx.input.sessionIds.length
      },
      message: `Performed **${ctx.input.action}** on **${ctx.input.sessionIds.length}** conversations.`
    };
  })
  .build();
