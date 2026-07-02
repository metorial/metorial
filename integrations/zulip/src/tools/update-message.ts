import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMessage = SlateTool.create(spec, {
  name: 'Update Message',
  key: 'update_message',
  description: `Edit the content or topic of an existing Zulip message. Can also move messages between topics.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z.number().describe('ID of the message to update'),
      content: z
        .string()
        .optional()
        .describe('New message content in Zulip-flavored Markdown'),
      topic: z.string().optional().describe('New topic for the message'),
      propagateMode: z
        .enum(['change_one', 'change_later', 'change_all'])
        .optional()
        .describe(
          'How topic changes propagate: "change_one" (only this message), "change_later" (this and later), "change_all" (all in topic)'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    await client.updateMessage(ctx.input.messageId, {
      content: ctx.input.content,
      topic: ctx.input.topic,
      propagateMode: ctx.input.propagateMode
    });

    return {
      output: { success: true },
      message: `Message ${ctx.input.messageId} updated successfully`
    };
  })
  .build();
