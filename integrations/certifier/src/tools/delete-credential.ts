import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCredential = SlateTool.create(spec, {
  name: 'Delete Credential',
  key: 'delete_credential',
  description: `Permanently delete a credential by its ID. This action cannot be undone.`,
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
      deleted: z.boolean().describe('Whether the credential was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteCredential(ctx.input.credentialId);

    return {
      output: {
        credentialId: ctx.input.credentialId,
        deleted: true
      },
      message: `Credential \`${ctx.input.credentialId}\` has been permanently deleted.`
    };
  })
  .build();
