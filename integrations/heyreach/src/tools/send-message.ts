import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a direct LinkedIn message to a lead through HeyReach. Requires the conversation ID, LinkedIn sender account ID, and message text.`,
  instructions: [
    'You must have an active conversation with the lead to send a message.',
    'Use get_conversations to find conversation IDs and their linkedInAccountId sender account IDs.'
  ]
})
  .input(
    z.object({
      conversationId: z.string().describe('The ID of the LinkedIn conversation'),
      accountId: z.number().describe('The LinkedIn account ID to send from'),
      senderId: z
        .string()
        .optional()
        .describe(
          'Legacy sender profile ID; no longer needed. The sender is selected with accountId.'
        ),
      subject: z
        .string()
        .optional()
        .describe('Message subject, when applicable to the conversation'),
      message: z.string().min(1).max(2000).describe('Message text to send (1-2000 characters)')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result of the send message operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendMessage(
      ctx.input.conversationId,
      ctx.input.accountId,
      ctx.input.message,
      ctx.input.subject
    );

    return {
      output: { result: result?.data ?? result },
      message: `Message sent to conversation **${ctx.input.conversationId}**.`
    };
  })
  .build();
