import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteToken = SlateTool.create(spec, {
  name: 'Delete Token',
  key: 'delete_token',
  description:
    'Delete a token, revoking its future use. Requires username and password authentication; API key authentication is not supported by this endpoint.',
  tags: { destructive: true, readOnly: false }
})
  .input(z.object({ tokenNumber: z.string().describe('Token number to revoke') }))
  .output(
    z.object({ deleted: z.boolean().describe('True after the provider confirms deletion') })
  )
  .handleInvocation(async ctx => {
    await new Client(ctx.auth.token).deleteToken(ctx.input.tokenNumber);
    return { output: { deleted: true }, message: 'Token deleted.' };
  })
  .build();
