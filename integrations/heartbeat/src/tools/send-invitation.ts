import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendInvitation = SlateTool.create(spec, {
  name: 'Send Invitation',
  key: 'send_invitation',
  description: `Sends an invitation email to a new user to join your Heartbeat community. Optionally specify a pre-approved invitation link to automatically approve the user.`,
  instructions: [
    'This legacy email-delivery request is not documented in the current public API reference and has not been verified. Use create_invitation_link only when you need link creation; it does not send email.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to send the invitation to'),
      invitationLinkId: z
        .string()
        .optional()
        .describe(
          'ID of a pre-approved invitation link. If specified, the email is automatically approved.'
        )
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address the invitation was sent to'),
      sent: z.boolean().describe('Whether the invitation was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.sendInvitation({
      email: ctx.input.email,
      invitationLinkId: ctx.input.invitationLinkId
    });

    return {
      output: {
        email: ctx.input.email,
        sent: true
      },
      message: `Sent invitation to **${ctx.input.email}**.${ctx.input.invitationLinkId ? ' Using pre-approved invitation link.' : ''}`
    };
  })
  .build();
