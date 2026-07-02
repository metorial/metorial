import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let editMessage = SlateTool.create(spec, {
  name: 'Edit Message',
  key: 'edit_message',
  description: `Edit an existing message in a Webex space. Only the text or markdown content can be updated. Messages with file attachments or Adaptive Cards cannot be edited. A message can be edited up to 10 times.`,
  constraints: [
    'Maximum 10 edits per message.',
    'Cannot edit messages that have file attachments or Adaptive Cards.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the message to edit'),
      roomId: z.string().describe('ID of the space containing the message'),
      text: z.string().optional().describe('Updated plain text content'),
      markdown: z.string().optional().describe('Updated Markdown content')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the edited message'),
      roomId: z.string().describe('ID of the space'),
      text: z.string().optional().describe('Updated plain text content'),
      markdown: z.string().optional().describe('Updated Markdown content'),
      updated: z.string().optional().describe('Timestamp of the edit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.updateMessage(ctx.input.messageId, {
      roomId: ctx.input.roomId,
      text: ctx.input.text,
      markdown: ctx.input.markdown
    });

    return {
      output: {
        messageId: result.id,
        roomId: result.roomId,
        text: result.text,
        markdown: result.markdown,
        updated: result.updated
      },
      message: `Message **${result.id}** edited successfully.`
    };
  })
  .build();
