import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendInvitations = SlateTool.create(spec, {
  name: 'Send Invitations',
  key: 'send_invitations',
  description: `Sends email invitations for a conference room to specified recipients. Invitation language can be configured per request.`
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room'),
      language: z
        .string()
        .default('en')
        .describe('Language code for the invitation email (e.g. "en", "de", "pl")'),
      attendees: z
        .array(
          z.object({
            email: z.string().describe('Email address of the recipient')
          })
        )
        .describe('List of recipients to invite')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.unknown()).describe('Invitation sending result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.sendInvitations(
      ctx.input.roomId,
      ctx.input.language,
      ctx.input.attendees
    );

    return {
      output: { result },
      message: `Sent invitations to **${ctx.input.attendees.length}** recipient(s) for room ${ctx.input.roomId} in ${ctx.input.language}.`
    };
  })
  .build();
