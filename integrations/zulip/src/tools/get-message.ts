import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { mapMessage, messageSchema } from './get-messages';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description:
    'Fetch one accessible Zulip message by ID, including reactions and message flags.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      messageId: z.number().describe('ID of the message to retrieve'),
      applyMarkdown: z
        .boolean()
        .optional()
        .describe(
          'Return rendered HTML when true, or original Markdown when false. Defaults to true'
        ),
      allowEmptyTopicName: z
        .boolean()
        .optional()
        .describe('Return empty topics as empty strings instead of the server display label')
    })
  )
  .output(
    z.object({
      message: messageSchema,
      raw: z
        .any()
        .describe(
          'Complete provider response, including message flags and edit history when available'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.getMessage(ctx.input.messageId, ctx.input);
    return {
      output: { message: mapMessage(result.message), raw: result },
      message: `Retrieved message ${ctx.input.messageId}`
    };
  })
  .build();
