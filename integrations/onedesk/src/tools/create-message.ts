import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMessage = SlateTool.create(spec, {
  name: 'Create Message',
  key: 'create_message',
  description: `Creates a message or comment on a conversation in OneDesk.
Use this to add comments to tickets, tasks, or other work items via their conversation ID.
Supports both internal team comments and customer-facing messages.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationExternalId: z
        .string()
        .describe('External ID of the conversation to post the message to.'),
      content: z.string().describe('Content of the message. Supports HTML formatting.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the newly created message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.createMessage({
      conversationExternalId: ctx.input.conversationExternalId,
      content: ctx.input.content
    });

    let messageId =
      typeof result === 'string' ? result : result?.id || result?.externalId || String(result);

    return {
      output: {
        messageId
      },
      message: `Created message \`${messageId}\` on conversation \`${ctx.input.conversationExternalId}\`.`
    };
  })
  .build();
