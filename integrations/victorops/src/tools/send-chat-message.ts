import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendChatMessage = SlateTool.create(spec, {
  name: 'Send Chat Message',
  key: 'send_chat_message',
  description: `Send a chat message to the VictorOps timeline. Messages appear in the team timeline and can be used to communicate during incident response.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Username of the sender'),
      text: z.string().describe('Message text to send'),
      monitoringTool: z
        .string()
        .optional()
        .describe('Name of the monitoring tool sending the message')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Chat message result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    let result = await client.sendChatMessage({
      username: ctx.input.username,
      text: ctx.input.text,
      monitoringTool: ctx.input.monitoringTool
    });

    return {
      output: { result },
      message: `Sent chat message to the timeline as **${ctx.input.username}**.`
    };
  })
  .build();
