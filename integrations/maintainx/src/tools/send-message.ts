import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Sends a message to a MaintainX conversation. Can be used to post updates, comments, or notifications to work order threads or other conversations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.number().describe('ID of the conversation to send the message to'),
      content: z.string().describe('Text content of the message')
    })
  )
  .output(
    z.object({
      messageId: z.number().optional().describe('ID of the created message'),
      conversationId: z.number().describe('ID of the conversation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createMessage(ctx.input.conversationId, {
      content: ctx.input.content
    });

    let msg = result.message ?? result;

    return {
      output: {
        messageId: msg.id,
        conversationId: ctx.input.conversationId
      },
      message: `Sent message to conversation **#${ctx.input.conversationId}**.`
    };
  })
  .build();
