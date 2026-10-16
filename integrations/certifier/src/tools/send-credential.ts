import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendCredential = SlateTool.create(spec, {
  name: 'Send Credential',
  key: 'send_credential',
  description:
    'Send or resend an already issued credential to its recipient by email using the email template configured on its credential template (group).',
  instructions: [
    'Only credentials with status issued can be sent. Use issue_credential for a draft credential.',
    'The credential must have a recipient email. Each successful call sends another email.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({ credentialId: z.string().describe('ID of the issued credential to send') })
  )
  .output(
    z.object({
      credentialId: z.string(),
      publicId: z.string(),
      status: z.string(),
      recipientName: z.string(),
      recipientEmail: z.string().optional(),
      sent: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let credential = await new Client({ token: ctx.auth.token }).sendCredential(
      ctx.input.credentialId
    );
    return {
      output: {
        credentialId: credential.id,
        publicId: credential.publicId,
        status: credential.status,
        recipientName: credential.recipient.name,
        recipientEmail: credential.recipient.email,
        sent: true
      },
      message: `Credential \`${credential.id}\` sent by email to **${credential.recipient.name}**.`
    };
  })
  .build();
