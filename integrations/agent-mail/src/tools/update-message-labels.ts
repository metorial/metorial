import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMessageLabels = SlateTool.create(spec, {
  name: 'Update Message Labels',
  key: 'update_message_labels',
  description: `Add or remove labels from an email message. Labels are used for organizing, filtering, and managing the state of conversations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox containing the message'),
      messageId: z.string().describe('ID of the message to update'),
      addLabels: z.array(z.string()).optional().describe('Labels to add to the message'),
      removeLabels: z
        .array(z.string())
        .optional()
        .describe('Labels to remove from the message')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Updated message ID'),
      labels: z.array(z.string()).describe('Current labels on the message after update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let message = await client.updateMessageLabels(
      ctx.input.inboxId,
      ctx.input.messageId,
      ctx.input.addLabels,
      ctx.input.removeLabels
    );

    return {
      output: {
        messageId: message.message_id,
        labels: message.labels
      },
      message: `Updated labels on message ${ctx.input.messageId}. Current labels: ${message.labels.join(', ') || 'none'}.`
    };
  })
  .build();
