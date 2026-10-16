import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the authenticated BTCPay Server user profile without requesting server information. Requires btcpay.user.canviewprofile.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional(),
      email: z.string().optional(),
      name: z.string().optional().nullable(),
      roles: z.array(z.string()).optional(),
      raw: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    let user = await new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    }).getCurrentUser();
    return {
      output: {
        userId: user.id as string | undefined,
        email: user.email as string | undefined,
        name: user.name as string | null | undefined,
        roles: user.roles as string[] | undefined,
        raw: user
      },
      message: 'Retrieved the authenticated user profile.'
    };
  })
  .build();
