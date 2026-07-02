import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMessageFlags = SlateTool.create(spec, {
  name: 'Manage Message Flags',
  key: 'manage_message_flags',
  description: `Add or remove personal flags on messages, such as marking messages as read, starred, or collapsed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageIds: z.array(z.number()).describe('IDs of messages to flag'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the flag'),
      flag: z
        .enum([
          'read',
          'starred',
          'collapsed',
          'mentioned',
          'wildcard_mentioned',
          'has_alert_word'
        ])
        .describe('The flag to set or unset')
    })
  )
  .output(
    z.object({
      messagesUpdated: z.number().describe('Number of messages that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    let result = await client.updateMessageFlags({
      messages: ctx.input.messageIds,
      op: ctx.input.action,
      flag: ctx.input.flag
    });

    return {
      output: {
        messagesUpdated: result.messages?.length ?? ctx.input.messageIds.length
      },
      message: `Flag "${ctx.input.flag}" ${ctx.input.action === 'add' ? 'added to' : 'removed from'} ${ctx.input.messageIds.length} message(s)`
    };
  })
  .build();
