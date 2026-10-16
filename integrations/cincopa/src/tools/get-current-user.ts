import { SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { requireSuccess } from '../lib/response';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description: 'Get the authenticated Cincopa user, account, and API-token permissions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      success: z.boolean(),
      userId: z.string().optional(),
      userEmail: z.string().optional(),
      accountId: z.string().optional(),
      accountEmail: z.string().optional(),
      permissions: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let data = await new CincopaClient(ctx.auth).ping();
    return {
      output: {
        success: requireSuccess(data),
        userId: data.userid,
        userEmail: data.useremail,
        accountId: data.accid,
        accountEmail: data.accemail,
        permissions: data.permissions
      },
      message: 'Retrieved the authenticated user and account.'
    };
  })
  .build();
