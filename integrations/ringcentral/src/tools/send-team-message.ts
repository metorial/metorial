import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTeamMessage = SlateTool.create(spec, {
  name: 'Send Team Message',
  key: 'send_team_message',
  description: `Post a message to a RingCentral team messaging chat. Supports plain text and optional attachments such as cards, events, and notes.`,
  instructions: [
    'Provide the **chatId** of the target conversation (team, group, or direct message).',
    'The **text** field supports plain text content for the message body.',
    'Optionally include **attachments** to send rich content like adaptive cards or event objects alongside the message.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z
        .string()
        .describe(
          'The ID of the chat (team, group, or direct message) to post the message to'
        ),
      text: z.string().describe('The text content of the message'),
      attachments: z
        .array(
          z.object({
            type: z
              .string()
              .describe('The type of attachment (e.g., "Card", "Event", "Note")'),
            properties: z
              .record(z.string(), z.any())
              .optional()
              .describe('Key-value properties specific to the attachment type')
          })
        )
        .optional()
        .describe('Optional array of attachment objects to include with the message')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('The unique identifier of the created post'),
      chatId: z.string().describe('The ID of the chat where the message was posted'),
      creatorId: z.string().describe('The ID of the user who created the post'),
      creationTime: z.string().describe('The ISO 8601 timestamp of when the post was created'),
      text: z.string().describe('The text content of the posted message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let attachments = ctx.input.attachments?.map(attachment => ({
      type: attachment.type,
      ...attachment.properties
    }));

    let result = await client.postTeamMessage(ctx.input.chatId, ctx.input.text, attachments);

    return {
      output: {
        postId: result.id,
        chatId: result.groupId || ctx.input.chatId,
        creatorId: result.creatorId,
        creationTime: result.creationTime,
        text: result.text || ctx.input.text
      },
      message: `Sent message to chat \`${ctx.input.chatId}\`.`
    };
  })
  .build();
