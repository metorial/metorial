import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCredential = SlateTool.create(spec, {
  name: 'Delete Credential',
  key: 'delete_credential',
  description: `Permanently delete a credential by its ID. This action cannot be undone. The deleted credential's details are returned for reference.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      credentialId: z.string().describe('ID of the credential to delete')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('ID of the deleted credential'),
      credentialName: z.string().optional().describe('Name of the deleted credential'),
      recipientName: z.string().optional().describe('Recipient name'),
      recipientEmail: z.string().optional().describe('Recipient email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let credential = await client.deleteCredential(ctx.input.credentialId);

    return {
      output: {
        credentialId: String(credential?.id || ctx.input.credentialId),
        credentialName: credential?.name,
        recipientName: credential?.recipient?.name,
        recipientEmail: credential?.recipient?.email
      },
      message: `Credential **${ctx.input.credentialId}** has been permanently deleted.`
    };
  })
  .build();
