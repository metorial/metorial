import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { required } from '../lib/http';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.string().describe('ID of the message'),
  roomId: z.string().describe('ID of the space'),
  roomType: z.string().optional().describe('Type of room (direct or group)'),
  personId: z.string().optional().describe('ID of the message author'),
  personEmail: z.string().optional().describe('Email of the message author'),
  text: z.string().optional().describe('Plain text content'),
  markdown: z.string().optional().describe('Markdown content'),
  files: z.array(z.string()).optional().describe('Attached file URLs'),
  parentId: z.string().optional().describe('Parent message ID for thread replies'),
  created: z.string().optional().describe('Creation timestamp'),
  updated: z.string().optional().describe('Last updated timestamp')
});

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `List messages in a Webex space or direct conversation. Use **roomId** to list messages in a specific space, or use **personId**/**personEmail** to list direct messages with a specific person.`,
  instructions: [
    'Either provide roomId for space messages, or personId/personEmail for direct messages.',
    'Results are returned in reverse chronological order (newest first).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nextPageUrl: z
        .string()
        .optional()
        .describe(
          'Native next-page URL returned by this tool. Use alone; do not add filters.'
        ),
      roomId: z.string().optional().describe('ID of the space to list messages from'),
      personId: z.string().optional().describe('Person ID to list direct messages with'),
      personEmail: z.string().optional().describe('Email to list direct messages with'),
      parentId: z
        .string()
        .optional()
        .describe('List only thread replies to this parent message'),
      mentionedPeople: z
        .string()
        .optional()
        .describe('Filter to messages mentioning this person ID (use "me" for yourself)'),
      before: z
        .string()
        .optional()
        .describe('List messages sent before this ISO 8601 timestamp'),
      beforeMessage: z
        .string()
        .optional()
        .describe('List messages sent before this message ID'),
      max: z
        .number()
        .optional()
        .describe('Maximum number of messages to return (default 50, max 1000)')
    })
  )
  .output(
    z.object({
      nextPageUrl: z.string().optional().describe('URL for the next native page, if present'),
      messages: z.array(messageSchema).describe('List of messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });
    let result: Awaited<ReturnType<WebexClient['listMessages']>>;
    const direct = ctx.input.personId !== undefined || ctx.input.personEmail !== undefined;
    if (ctx.input.roomId !== undefined && direct)
      throw createApiServiceError('Choose a space or a direct-message target, not both.');
    if (
      direct &&
      [
        ctx.input.mentionedPeople,
        ctx.input.before,
        ctx.input.beforeMessage,
        ctx.input.max
      ].some(v => v !== undefined)
    )
      throw createApiServiceError(
        'Direct-message listing supports parentId, personId or personEmail only. Use roomId for page-size, mention and date filters.'
      );
    if (ctx.input.nextPageUrl) {
      if (
        Object.entries(ctx.input).some(
          ([key, value]) => key !== 'nextPageUrl' && value !== undefined
        )
      )
        throw createApiServiceError('Use nextPageUrl alone.');
      let url: URL;
      try {
        url = new URL(ctx.input.nextPageUrl);
      } catch {
        throw createApiServiceError('Use a native next-page URL.');
      }
      result =
        url.pathname === '/v1/messages/direct'
          ? await client.listDirectMessages({ nextPageUrl: ctx.input.nextPageUrl })
          : await client.listMessages({ nextPageUrl: ctx.input.nextPageUrl });
    } else if (direct) {
      result = await client.listDirectMessages({
        personId: ctx.input.personId,
        personEmail: ctx.input.personEmail,
        parentId: ctx.input.parentId
      });
    } else {
      result = await client.listMessages({
        roomId: ctx.input.roomId,
        parentId: ctx.input.parentId,
        mentionedPeople: ctx.input.mentionedPeople,
        before: ctx.input.before,
        beforeMessage: ctx.input.beforeMessage,
        max: ctx.input.max
      });
    }
    let items = result.items;

    let messages = items.map(m => ({
      messageId: m.id,
      roomId: required(m.roomId, 'message room ID'),
      roomType: m.roomType,
      personId: m.personId,
      personEmail: m.personEmail,
      text: m.text,
      markdown: m.markdown,
      files: m.files,
      parentId: m.parentId,
      created: m.created,
      updated: m.updated
    }));

    return {
      output: { messages, nextPageUrl: result.nextPageUrl },
      message: `Found **${messages.length}** message(s).`
    };
  })
  .build();
