import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteThreadPermanently = SlateTool.create(spec, {
  name: 'Delete Thread Permanently',
  key: 'delete_thread_permanently',
  description: `Immediately and permanently delete a Gmail thread and all messages in it. This bypasses Trash and cannot be undone.`,
  instructions: [
    'Use this only when the user explicitly asks to permanently delete a thread.',
    'Use **manage_thread** with action "trash" for reversible deletion.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(gmailActionScopes.deleteThreadPermanently)
  .input(
    z.object({
      threadId: z.string().describe('Gmail thread ID to permanently delete.')
    })
  )
  .output(
    z.object({
      deleted: z.literal(true).describe('Whether deletion was successful.'),
      threadId: z.string().describe('ID of the permanently deleted thread.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    await client.deleteThread(ctx.input.threadId);

    return {
      output: {
        deleted: true,
        threadId: ctx.input.threadId
      },
      message: `Permanently deleted thread **${ctx.input.threadId}**.`
    };
  });
