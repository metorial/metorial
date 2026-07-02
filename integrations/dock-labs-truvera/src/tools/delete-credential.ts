import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCredential = SlateTool.create(spec, {
  name: 'Delete Credential',
  key: 'delete_credential',
  description: `Delete a credential from the Dock Certs platform by its ID. This removes the credential metadata and any persisted encrypted data.`,
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
      deleted: z.boolean().describe('Whether the credential was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    await client.deleteCredential(ctx.input.credentialId);
    return {
      output: { deleted: true },
      message: `Deleted credential **${ctx.input.credentialId}**`
    };
  })
  .build();
