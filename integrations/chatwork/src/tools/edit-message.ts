import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let editMessage = SlateTool.create(spec, {
  name: 'Edit Message',
  key: 'edit_message',
  description: `Edits an existing message in a chat room. Only the sender of the message can edit it. System messages cannot be edited.`,
  constraints: [
    'Only the original sender can edit a message.',
    'Message body must be between 1 and 65,535 characters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room'),
      messageId: z.string().describe('ID of the message to edit'),
      body: z.string().min(1).max(65535).describe('New message content')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the edited message')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let result = await client.updateMessage(
      ctx.input.roomId,
      ctx.input.messageId,
      ctx.input.body
    );

    return {
      output: { messageId: result.message_id },
      message: `Edited message ${result.message_id} in room ${ctx.input.roomId}.`
    };
  })
  .build();
