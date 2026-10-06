import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the Capsule CRM user associated with this connection, including their ID, name, timezone, and default currency.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      name: z.string(),
      username: z.string(),
      status: z.string().nullish(),
      timezone: z.string().nullish(),
      currency: z.string().nullish(),
      locale: z.string().nullish(),
      party: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });
    let user = await client.getCurrentUser();
    return {
      output: {
        userId: user.id,
        name: user.name,
        username: user.username,
        status: user.status,
        timezone: user.timezone,
        currency: user.currency,
        locale: user.locale,
        party: user.party
      },
      message: `Connected as **${user.name}** (ID: ${user.id}).`
    };
  })
  .build();
