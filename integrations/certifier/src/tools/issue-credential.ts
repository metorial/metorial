import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let issueCredential = SlateTool.create(spec, {
  name: 'Issue Credential',
  key: 'issue_credential',
  description: `Issue a draft credential, changing its status from "draft" to "issued". Optionally sends the credential to the recipient via email after issuing.`,
  instructions: [
    'Only credentials with status "draft" can be issued.',
    'Set send to true to also deliver the credential via email after issuing.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      credentialId: z.string().describe('ID of the draft credential to issue'),
      send: z
        .boolean()
        .optional()
        .describe(
          'If true, also sends the credential to the recipient via email after issuing'
        )
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('ID of the issued credential'),
      publicId: z.string().describe('Public UUID of the credential'),
      status: z.string().describe('Updated status of the credential'),
      recipientName: z.string().describe('Name of the recipient'),
      recipientEmail: z.string().optional().describe('Email of the recipient'),
      sent: z.boolean().describe('Whether the credential was also sent via email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let credential = await client.issueCredential(ctx.input.credentialId);
    let sent = false;

    if (ctx.input.send) {
      credential = await client.sendCredential(ctx.input.credentialId);
      sent = true;
    }

    return {
      output: {
        credentialId: credential.id,
        publicId: credential.publicId,
        status: credential.status,
        recipientName: credential.recipient.name,
        recipientEmail: credential.recipient.email,
        sent
      },
      message: sent
        ? `Credential \`${credential.id}\` issued and sent to **${credential.recipient.name}**${credential.recipient.email ? ` (${credential.recipient.email})` : ''}.`
        : `Credential \`${credential.id}\` issued for **${credential.recipient.name}**. Status: **${credential.status}**.`
    };
  })
  .build();
