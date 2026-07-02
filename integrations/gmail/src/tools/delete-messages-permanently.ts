import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteMessagesPermanently = SlateTool.create(spec, {
  name: 'Delete Messages Permanently',
  key: 'delete_messages_permanently',
  description: `Immediately and permanently delete one or more Gmail messages. This bypasses Trash and cannot be undone.`,
  instructions: [
    'Use this only when the user explicitly asks to permanently delete messages.',
    'Use **modify_message** with action "trash" for reversible deletion.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(gmailActionScopes.deleteMessagesPermanently)
  .input(
    z.object({
      messageIds: z
        .array(z.string())
        .min(1)
        .describe('One or more Gmail message IDs to permanently delete.')
    })
  )
  .output(
    z.object({
      deleted: z.literal(true).describe('Whether deletion was successful.'),
      deletedCount: z.number().describe('Number of messages permanently deleted.'),
      messageIds: z.array(z.string()).describe('IDs of permanently deleted messages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    for (let id of ctx.input.messageIds) {
      await client.deleteMessage(id);
    }

    return {
      output: {
        deleted: true,
        deletedCount: ctx.input.messageIds.length,
        messageIds: ctx.input.messageIds
      },
      message: `Permanently deleted **${ctx.input.messageIds.length}** message(s).`
    };
  });
