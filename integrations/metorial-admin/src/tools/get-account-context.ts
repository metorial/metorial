import { SlateTool } from 'slates';
import { z } from 'zod';
import { resolveMetorialRuntimeConfig } from '../config';
import { MetorialClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountContext = SlateTool.create(spec, {
  name: 'Get Account Context',
  key: 'get_account_context',
  description:
    'Read the authenticated credential type and its organization, project, instance, actor, and user context when available. Returns identity metadata, without returning the credential itself.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      context: z
        .record(z.string(), z.unknown())
        .describe(
          'Complete account context returned by Metorial. Unavailable identities remain null.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetorialClient(resolveMetorialRuntimeConfig(ctx.config, ctx.auth));
    let context = await client.getTokenContext(ctx.auth.token);
    return {
      output: { context },
      message: 'Retrieved the authenticated Metorial account context.'
    };
  })
  .build();
