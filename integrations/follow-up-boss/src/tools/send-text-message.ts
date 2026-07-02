import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let sendTextMessage = SlateTool.create(spec, {
  name: 'Send Text Message',
  key: 'send_text_message',
  description: `Send a text message to a contact in Follow Up Boss. Messages are sent via the user's connected phone number and logged in the contact's communication history.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('Contact ID to send the message to'),
      message: z.string().describe('Text message content'),
      userId: z
        .number()
        .optional()
        .describe('User ID sending the message (defaults to authenticated user)'),
      to: z
        .string()
        .optional()
        .describe('Recipient phone number (if different from contact default)')
    })
  )
  .output(
    z.object({
      textMessageId: z.number(),
      personId: z.number().optional(),
      message: z.string().optional(),
      created: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      personId: ctx.input.personId,
      message: ctx.input.message
    };
    if (ctx.input.userId !== undefined) data.userId = ctx.input.userId;
    if (ctx.input.to !== undefined) data.to = ctx.input.to;

    let result = await client.createTextMessage(data);

    return {
      output: {
        textMessageId: result.id,
        personId: result.personId,
        message: result.message,
        created: result.created
      },
      message: `Sent text message to contact **${ctx.input.personId}**.`
    };
  })
  .build();
