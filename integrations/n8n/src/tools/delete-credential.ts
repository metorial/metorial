import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCredential = SlateTool.create(spec, {
  name: 'Delete Credential',
  key: 'delete_credential',
  description: `Permanently delete a credential from n8n. Workflows using this credential will no longer be able to authenticate. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      credentialId: z.string().describe('ID of the credential to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    await client.deleteCredential(ctx.input.credentialId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted credential **${ctx.input.credentialId}**.`
    };
  })
  .build();
