import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the connected Handwrytten account, including available profile and credit information.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Connected account ID'),
      account: z
        .record(z.string(), z.unknown())
        .describe('Account information returned by Handwrytten')
    })
  )
  .handleInvocation(async ctx => {
    let account = await new Client({ token: ctx.auth.token }).getUser();
    let userId = account.id ?? account.user_id;
    if (userId === undefined || userId === null || String(userId).trim() === '') {
      throw createApiServiceError('Handwrytten did not return an account ID.');
    }
    return {
      output: { userId: String(userId), account },
      message: `Retrieved account \`${userId}\`.`
    };
  })
  .build();
