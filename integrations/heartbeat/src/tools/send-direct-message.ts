import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendDirectMessage = SlateTool.create(spec, {
  name: 'Send Direct Message',
  key: 'send_direct_message',
  description: `Sends a direct message to a community member. Useful for automated notifications, bot responses, or personalized outreach.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to send the message to'),
      text: z.string().describe('Message content to send')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the user the message was sent to'),
      sent: z.boolean().describe('Whether the message was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.sendDirectMessage({
      userId: ctx.input.userId,
      text: ctx.input.text
    });

    return {
      output: {
        userId: ctx.input.userId,
        sent: true
      },
      message: `Sent direct message to user **${ctx.input.userId}**.`
    };
  })
  .build();
