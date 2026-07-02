import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let resendEsignInvitation = SlateTool.create(spec, {
  name: 'Resend E-Sign Invitation',
  key: 'resend_esign_invitation',
  description: `Resends the signing invitation email to a specific signer in an e-signature session. Useful when a signer hasn't received or has lost the original invitation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The e-signature session ID.'),
      signerIndex: z
        .number()
        .describe('The signer index (1-based). First signer is 1, second is 2, etc.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the invitation was resent successfully.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.resendEsignInvitation(ctx.input.sessionId, ctx.input.signerIndex);

    return {
      output: {
        success: true
      },
      message: `Resent signing invitation to signer **#${ctx.input.signerIndex}** in session **${ctx.input.sessionId}**.`
    };
  })
  .build();
