import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCredential = SlateTool.create(spec, {
  name: 'Get Credential',
  key: 'get_credential',
  description: `Retrieve a specific credential by ID. If the credential was persisted with encryption, a password is required to decrypt and access the full credential data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      credentialId: z.string().describe('ID of the credential to retrieve'),
      password: z.string().optional().describe('Decryption password for persisted credentials')
    })
  )
  .output(
    z.object({
      credential: z.any().describe('The full credential data')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getCredential(ctx.input.credentialId, ctx.input.password);

    return {
      output: {
        credential: result
      },
      message: `Retrieved credential **${ctx.input.credentialId}**.`
    };
  })
  .build();
