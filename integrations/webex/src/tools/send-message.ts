import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to a Webex space or directly to a person. Supports plain text, Markdown formatting, file attachments via URL, and Adaptive Cards.
Use **roomId** to send to a specific space, or **toPersonId**/**toPersonEmail** to send a direct 1:1 message.
Set **parentId** to reply in a thread.`,
  instructions: [
    'Provide either roomId, toPersonId, or toPersonEmail to specify the destination.',
    'For file attachments, provide a publicly accessible URL in the files array.',
    'Adaptive Cards are passed as JSON objects in the attachments array.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      roomId: z.string().optional().describe('ID of the space to send the message to'),
      toPersonId: z.string().optional().describe('Person ID for a direct 1:1 message'),
      toPersonEmail: z.string().optional().describe('Email address for a direct 1:1 message'),
      parentId: z
        .string()
        .optional()
        .describe('ID of the parent message to reply in a thread'),
      text: z.string().optional().describe('Plain text message content'),
      markdown: z.string().optional().describe('Markdown-formatted message content'),
      files: z.array(z.string()).optional().describe('Array of file URLs to attach (max 1)'),
      attachments: z
        .array(z.any())
        .optional()
        .describe('Array of Adaptive Card attachment objects')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the created message'),
      roomId: z.string().describe('ID of the space the message was posted to'),
      roomType: z.string().optional().describe('Type of room (direct or group)'),
      personId: z.string().optional().describe('ID of the message sender'),
      personEmail: z.string().optional().describe('Email of the message sender'),
      text: z.string().optional().describe('Plain text content of the message'),
      markdown: z.string().optional().describe('Markdown content of the message'),
      created: z.string().optional().describe('Timestamp when the message was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.createMessage({
      roomId: ctx.input.roomId,
      toPersonId: ctx.input.toPersonId,
      toPersonEmail: ctx.input.toPersonEmail,
      parentId: ctx.input.parentId,
      text: ctx.input.text,
      markdown: ctx.input.markdown,
      files: ctx.input.files,
      attachments: ctx.input.attachments
    });

    return {
      output: {
        messageId: result.id,
        roomId: result.roomId,
        roomType: result.roomType,
        personId: result.personId,
        personEmail: result.personEmail,
        text: result.text,
        markdown: result.markdown,
        created: result.created
      },
      message: `Message sent successfully to ${result.roomType === 'direct' ? 'direct conversation' : `space **${result.roomId}**`}.`
    };
  })
  .build();
