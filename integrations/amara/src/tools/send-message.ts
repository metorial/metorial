import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to an individual user or an entire team through the Amara messaging system. Provide either a user or a team as the recipient, not both.`,
  instructions: [
    'Provide exactly one of "recipientUser" (username) or "recipientTeam" (team slug).',
    'Both subject and content are required.'
  ]
})
  .input(
    z.object({
      recipientUser: z.string().optional().describe('Username of the recipient user'),
      recipientTeam: z.string().optional().describe('Team slug to message the entire team'),
      subject: z.string().describe('Message subject'),
      content: z.string().describe('Message body content')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the message was sent successfully'),
      recipient: z.string().describe('The recipient (user or team)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    if (!ctx.input.recipientUser && !ctx.input.recipientTeam) {
      throw new Error('Provide either recipientUser or recipientTeam');
    }

    await client.sendMessage({
      user: ctx.input.recipientUser,
      team: ctx.input.recipientTeam,
      subject: ctx.input.subject,
      content: ctx.input.content
    });

    let recipient = ctx.input.recipientUser
      ? `user **${ctx.input.recipientUser}**`
      : `team **${ctx.input.recipientTeam}**`;

    return {
      output: {
        sent: true,
        recipient: ctx.input.recipientUser || ctx.input.recipientTeam || ''
      },
      message: `Sent message "${ctx.input.subject}" to ${recipient}.`
    };
  })
  .build();
