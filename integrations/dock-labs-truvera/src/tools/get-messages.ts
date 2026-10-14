import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let getMessages = SlateTool.create(spec, {
  name: 'Get DIDComm Messages',
  key: 'get_messages',
  description:
    'List received DIDComm messages, newest first, or retrieve one message with its content. Use this to read wallet responses after sending a message.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      messageId: z
        .string()
        .optional()
        .describe('Message ID to retrieve, returned by list. Omit to list messages'),
      toDid: z.string().optional().describe('Filter the message list by recipient DID'),
      messageType: z
        .string()
        .optional()
        .describe('Filter the message list by schema URI or message type'),
      offset: z.number().optional().describe('Non-negative whole-number pagination offset'),
      limit: z.number().optional().describe('Maximum results, from 1 to 64')
    })
  )
  .output(
    z.object({
      message: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Message metadata and content'),
      messages: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Message metadata; retrieve a message to read its content'),
      total: z.number().optional().describe('Total messages matching the filters'),
      offset: z.number().optional().describe('Current pagination offset'),
      limit: z.number().optional().describe('Current page size')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });
    if (ctx.input.messageId) {
      let message = await client.getMessage(ctx.input.messageId);
      return { output: { message }, message: `Retrieved message **${ctx.input.messageId}**.` };
    }
    let result = await client.listMessages({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      to: ctx.input.toDid,
      messageType: ctx.input.messageType
    });
    if (!Array.isArray(result.messages) || !result.messages.every(isApiErrorRecord)) {
      throw createApiServiceError('Truvera returned an invalid message list.');
    }
    return {
      output: {
        messages: result.messages,
        total: typeof result.total === 'number' ? result.total : undefined,
        offset: typeof result.offset === 'number' ? result.offset : undefined,
        limit: typeof result.limit === 'number' ? result.limit : undefined
      },
      message: `Found **${result.messages.length}** message(s).`
    };
  })
  .build();
