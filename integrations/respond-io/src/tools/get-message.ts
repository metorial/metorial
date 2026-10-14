import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, messageOutput } from '../lib/client';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description:
    'Retrieve a message and its delivery history for a contact. Use List Messages to discover message IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID from Get Contact or List Contacts'),
      messageId: z
        .string()
        .describe('Message ID from Send Message, Send Template Message, or List Messages')
    })
  )
  .output(
    z.object({
      messageId: z.string(),
      contactId: z.string(),
      channelId: z.string().optional(),
      direction: z.string().optional(),
      type: z.string().optional(),
      text: z.string().optional(),
      status: z.string().optional(),
      deliveryHistory: z.array(z.any()).optional().describe('Delivery states and timestamps'),
      sender: z
        .record(z.string(), z.any())
        .optional()
        .describe('Sender source and related user, workflow, or team IDs'),
      content: z.record(z.string(), z.any()).describe('Message content and provider metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getMessage(ctx.input.contactId, ctx.input.messageId);
    let message = result?.data ?? result;
    return {
      output: {
        ...messageOutput(message),
        contactId: String(message.contactId ?? ctx.input.contactId),
        deliveryHistory: Array.isArray(message.status) ? message.status : undefined,
        sender: message.sender ?? undefined,
        content: message.message ?? {}
      },
      message: `Retrieved message **${ctx.input.messageId}** for contact **${ctx.input.contactId}**.`
    };
  })
  .build();
