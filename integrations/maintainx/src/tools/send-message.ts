import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Sends a message to a MaintainX conversation. Can be used to post updates, comments, or notifications to work order threads or other conversations. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
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
    let client = Client.fromContext(ctx);

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
