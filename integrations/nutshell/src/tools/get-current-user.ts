import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the authenticated Nutshell user and CRM instance. API key impersonation settings determine the effective user.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      instanceId: z.string(),
      name: z.string(),
      emails: z.array(z.string()),
      isEnabled: z.boolean().optional(),
      isAdministrator: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient(ctx.auth);
    let user = await client.getUser();
    let instance = await client.instanceData();
    return {
      output: {
        userId: user.id,
        instanceId: instance.id,
        name: user.name,
        emails: (user.email ?? []).filter(
          (value): value is string => typeof value === 'string'
        ),
        isEnabled: typeof user.isEnabled === 'boolean' ? user.isEnabled : undefined,
        isAdministrator:
          typeof user.isAdministrator === 'boolean' ? user.isAdministrator : undefined
      },
      message: `Authenticated Nutshell user ${user.id} in instance ${instance.id}.`
    };
  })
  .build();
