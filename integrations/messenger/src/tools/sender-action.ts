import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let senderAction = SlateTool.create(spec, {
  name: 'Send Sender Action',
  key: 'send_sender_action',
  description: `Display a typing indicator or mark a message as read in a Messenger conversation. Use **typing_on** to show a typing bubble, **typing_off** to hide it, and **mark_seen** to show a read receipt.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientId: z.string().describe('Page-Scoped User ID (PSID) of the recipient'),
      action: z
        .enum(['typing_on', 'typing_off', 'mark_seen'])
        .describe(
          'Sender action to display: typing_on (show typing), typing_off (hide typing), mark_seen (read receipt)'
        )
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('PSID of the recipient'),
      success: z.boolean().describe('Whether the action was applied successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      pageId: ctx.config.pageId,
      apiVersion: ctx.config.apiVersion
    });

    await client.sendSenderAction(ctx.input.recipientId, ctx.input.action);

    let actionLabel = {
      typing_on: 'Typing indicator shown',
      typing_off: 'Typing indicator hidden',
      mark_seen: 'Message marked as read'
    }[ctx.input.action];

    return {
      output: {
        recipientId: ctx.input.recipientId,
        success: true
      },
      message: `${actionLabel} for user **${ctx.input.recipientId}**.`
    };
  })
  .build();
