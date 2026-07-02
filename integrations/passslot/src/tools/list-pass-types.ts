import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPassTypes = SlateTool.create(spec, {
  name: 'List Pass Type IDs',
  key: 'list_pass_types',
  description: `List all available Apple Wallet pass type identifiers associated with your PassSlot account. Pass type IDs are required when creating templates and identifying passes.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      passTypes: z.array(z.any()).describe('List of pass type identifiers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let passTypes = await client.listPassTypes();

    return {
      output: { passTypes },
      message: `Found **${passTypes.length}** pass type identifier(s).`
    };
  })
  .build();
