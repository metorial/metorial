import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createConversation = SlateTool.create(spec, {
  name: 'Create Conversation',
  key: 'create_conversation',
  description: `Create a new conversation in your Crisp workspace. Returns the new session ID. You can optionally set initial metadata such as nickname, email, subject, and segments after creation using the Update Conversation tool.`,
  tags: {
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sessionId: z.string().describe('Session ID of the newly created conversation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });
    let result = await client.createConversation();

    return {
      output: {
        sessionId: result.session_id
      },
      message: `Created new conversation with session ID **${result.session_id}**.`
    };
  })
  .build();
