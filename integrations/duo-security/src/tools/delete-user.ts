import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { validateInput } from '../lib/contracts';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently remove a Duo Security user without trash or restoration. Associated phones are not immediately deleted; retained devices and historical audit effects require separate reconciliation.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The Duo user ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    validateInput('delete_user', ctx.input, [ctx.auth.secretKey]);
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname,
      signingVersion: ctx.auth.signingVersion
    });

    await client.deleteUser(ctx.input.userId);

    return {
      output: { deleted: true },
      message: `Deleted user \`${ctx.input.userId}\`.`
    };
  })
  .build();
