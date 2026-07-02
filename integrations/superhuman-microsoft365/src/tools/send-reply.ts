import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendReply = SlateTool.create(spec, {
  name: 'Send Reply',
  key: 'send_reply',
  description:
    'Send a reply either by **submitting an existing draft** (`send_draft`) or **Graph reply / replyAll** with a short comment (`instant_reply`). Prefer `send_draft` after **Manage Reply Draft** when the body was edited.',
  instructions: [
    '**instant_reply** sends immediately; it is best for short acknowledgments, not long composed bodies.',
    '**send_draft** calls Graph `send` on a draft **message id** (from createReply or manual drafts).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.discriminatedUnion('mode', [
      z.object({
        mode: z.literal('send_draft'),
        draftMessageId: z.string().describe('Draft message id to send')
      }),
      z.object({
        mode: z.literal('instant_reply'),
        messageId: z.string().describe('Message being replied to'),
        replyAll: z.boolean().describe('Use reply-all instead of reply'),
        comment: z
          .string()
          .describe('Plain text or HTML comment body Graph will send (empty string allowed)')
      })
    ])
  )
  .output(z.object({ sent: z.boolean() }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.mode === 'send_draft') {
      await client.sendDraft(input.draftMessageId);
      return {
        output: { sent: true },
        message: `Sent draft **${input.draftMessageId}**.`
      };
    }

    await client.replyToMessage(input.messageId, input.comment, input.replyAll);
    return {
      output: { sent: true },
      message: input.replyAll
        ? `Sent reply-all on message **${input.messageId}**.`
        : `Sent reply on message **${input.messageId}**.`
    };
  })
  .build();
