import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
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
      messages: z.array(messageSchema).describe('List of messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });
    let items: any[];

    if (ctx.input.personId || ctx.input.personEmail) {
      let result = await client.listDirectMessages({
        personId: ctx.input.personId,
        personEmail: ctx.input.personEmail
      });
      items = result.items || [];
    } else if (ctx.input.roomId) {
      let result = await client.listMessages({
        roomId: ctx.input.roomId,
        parentId: ctx.input.parentId,
        mentionedPeople: ctx.input.mentionedPeople,
        before: ctx.input.before,
        beforeMessage: ctx.input.beforeMessage,
        max: ctx.input.max
      });
      items = result.items || [];
    } else {
      items = [];
    }

    let messages = items.map((m: any) => ({
      messageId: m.id,
      roomId: m.roomId,
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
      output: { messages },
      message: `Found **${messages.length}** message(s).`
    };
  })
  .build();
