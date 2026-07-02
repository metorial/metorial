import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePass = SlateTool.create(spec, {
  name: 'Delete Pass',
  key: 'delete_pass',
  description: `Permanently delete a pass. This action cannot be undone. The pass will be removed from all wallets on the next update cycle.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      passId: z
        .string()
        .describe('Identifier of the pass to delete (UUID, userProvidedId, or barcodeValue)')
    })
  )
  .output(
    z.object({
      passId: z.string().describe('Identifier of the deleted pass')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deletePass(ctx.input.passId);

    return {
      output: { passId: ctx.input.passId },
      message: `Deleted pass \`${ctx.input.passId}\`.`
    };
  })
  .build();
