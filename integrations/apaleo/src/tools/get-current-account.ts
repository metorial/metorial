import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentAccount = SlateTool.create(spec, {
  name: 'Get Current Account',
  key: 'get_current_account',
  description:
    'Identify the Apaleo account used by the connection, including its account code, name, status, and default language.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z
      .object({
        code: z.string(),
        name: z.string(),
        type: z.string(),
        defaultLanguage: z.string(),
        description: z.string().optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let account = await new ApaleoClient(ctx.auth.token).getCurrentAccount();
    return {
      output: { ...account, description: account.description ?? undefined },
      message: `Connected to **${account.name}** (${account.code}).`
    };
  })
  .build();
