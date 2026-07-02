import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description: `Retrieve the full details of a specific message by its ID, including text content, attachments, mentioned people, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the message to retrieve')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the message'),
      roomId: z.string().describe('ID of the space containing the message'),
      roomType: z.string().optional().describe('Type of room (direct or group)'),
      personId: z.string().optional().describe('ID of the message author'),
      personEmail: z.string().optional().describe('Email of the message author'),
      text: z.string().optional().describe('Plain text content'),
      markdown: z.string().optional().describe('Markdown content'),
      html: z.string().optional().describe('HTML content'),
      files: z.array(z.string()).optional().describe('Attached file URLs'),
      mentionedPeople: z.array(z.string()).optional().describe('IDs of mentioned people'),
      mentionedGroups: z
        .array(z.string())
        .optional()
        .describe('Mentioned groups (e.g. "all")'),
      parentId: z.string().optional().describe('Parent message ID if this is a thread reply'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.getMessage(ctx.input.messageId);

    return {
      output: {
        messageId: result.id,
        roomId: result.roomId,
        roomType: result.roomType,
        personId: result.personId,
        personEmail: result.personEmail,
        text: result.text,
        markdown: result.markdown,
        html: result.html,
        files: result.files,
        mentionedPeople: result.mentionedPeople,
        mentionedGroups: result.mentionedGroups,
        parentId: result.parentId,
        created: result.created,
        updated: result.updated
      },
      message: `Retrieved message from **${result.personEmail}** in space **${result.roomId}**.`
    };
  })
  .build();
