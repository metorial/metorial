import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getObjectResult } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Get Current Account',
  key: 'who_am_i',
  description: 'Retrieve the account profile connected to the current API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      active: z.boolean().optional(),
      roleId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let user = getObjectResult(await new Client(ctx.auth).getUser());
    if (!user.id) {
      throw createApiServiceError('Insighto.ai did not return an account ID.');
    }
    return {
      output: {
        userId: user.id,
        email: user.email ?? undefined,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined,
        active: user.is_active ?? undefined,
        roleId: user.role_id ?? undefined
      },
      message: `Retrieved account **${user.email || user.id}**.`
    };
  })
  .build();
