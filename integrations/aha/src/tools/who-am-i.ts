import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description:
    'Retrieve the authenticated Aha! user and account subdomain. Use this to confirm which user and account a connection represents.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Current user ID'),
      name: z.string().describe('Current user name'),
      email: z.string().optional().describe('Current user email'),
      subdomain: z.string().describe('Connected Aha! account subdomain')
    })
  )
  .handleInvocation(async ctx => {
    let user = await AhaClient.fromContext(ctx).getMe();
    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        subdomain: AhaClient.resolveSubdomain(ctx.auth.subdomain, ctx.config)
      },
      message: `Connected as **${user.name}**${user.email ? ` (${user.email})` : ''}.`
    };
  })
  .build();
