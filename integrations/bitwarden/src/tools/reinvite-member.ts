import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reinviteMember = SlateTool.create(spec, {
  name: 'Reinvite Member',
  key: 'reinvite_member',
  description: `Resend the invitation email to an organization member who has not yet accepted. Useful when the original invitation expired or was missed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      memberId: z.string().describe('ID of the member to reinvite')
    })
  )
  .output(
    z.object({
      reinvited: z.boolean().describe('Whether the reinvitation was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    await client.reinviteMember(ctx.input.memberId);

    return {
      output: { reinvited: true },
      message: `Reinvitation sent to member **${ctx.input.memberId}**.`
    };
  })
  .build();
