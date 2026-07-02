import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve email and SMS messages. Get a specific message by ID or list messages with optional date filters and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z
        .number()
        .optional()
        .describe('Specific message ID to retrieve. Omit to list all messages.'),
      dateFrom: z
        .string()
        .optional()
        .describe('Filter messages created after this date (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('Filter messages created before this date (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Maximum number of messages to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      message: z
        .any()
        .optional()
        .describe('Single message details (when messageId is provided)'),
      messages: z.any().optional().describe('List of messages (when listing all)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    if (ctx.input.messageId) {
      let msg = await client.getMessage(ctx.input.messageId);
      return {
        output: { message: msg },
        message: `Retrieved message \`${ctx.input.messageId}\``
      };
    }

    let messages = await client.listMessages({
      date_from: ctx.input.dateFrom,
      date_to: ctx.input.dateTo,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: { messages },
      message: `Retrieved messages`
    };
  })
  .build();
