import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let sendTextMessage = SlateTool.create(spec, {
  name: 'Log Text Message',
  key: 'send_text_message',
  description: `Record an externally sent or received text message in a contact's communication history. This endpoint logs messages only; it does not send SMS.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('Contact ID associated with the message'),
      message: z.string().describe('Text message content'),
      userId: z
        .number()
        .optional()
        .describe(
          'Legacy attribution field; the API uses the authenticated user and does not support an override'
        ),
      to: z
        .string()
        .optional()
        .describe('Recipient phone number; required to record the message'),
      fromNumber: z
        .string()
        .optional()
        .describe('Sender phone number; required to record the message'),
      isIncoming: z
        .boolean()
        .optional()
        .describe('Whether the message was received from the contact')
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
    if (!ctx.input.to || !ctx.input.fromNumber) {
      throw createApiServiceError(
        'Provide to and fromNumber to log an externally sent or received text message. This API does not send SMS.'
      );
    }
    if (ctx.input.userId !== undefined) {
      throw createApiServiceError(
        'Text-message logs use the authenticated user. Omit userId.'
      );
    }
    data.toNumber = ctx.input.to;
    data.fromNumber = ctx.input.fromNumber;
    if (ctx.input.isIncoming !== undefined) data.isIncoming = ctx.input.isIncoming;

    let result = await client.createTextMessage(data);

    return {
      output: {
        textMessageId: result.id,
        personId: result.personId,
        message: result.message,
        created: result.created
      },
      message: `Logged text message for contact **${ctx.input.personId}**. No SMS was sent.`
    };
  })
  .build();
