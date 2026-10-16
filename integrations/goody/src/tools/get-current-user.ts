import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient, resolveGoodyEnvironment } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the connected Goody Automation user or Commerce app and its API environment.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().nullable().describe('Connected user email for an Automation API key'),
      publicAppId: z.string().nullable().describe('Connected app ID for a Commerce API key'),
      environment: z.string().describe('API environment used by the connection')
    })
  )
  .handleInvocation(async ctx => {
    let me = await createGoodyClient(ctx).getMe();
    return {
      output: {
        email: me.email ?? null,
        publicAppId: me.public_app_id ?? null,
        environment: resolveGoodyEnvironment(ctx.auth, ctx.config)
      },
      message: `Connected to Goody as **${me.email || me.public_app_id}**.`
    };
  })
  .build();
