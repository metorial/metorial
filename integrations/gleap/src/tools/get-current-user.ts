import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Retrieve the authenticated Gleap teammate or service account identity.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z.object({
        id: z.string().optional(),
        email: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        userType: z.string().optional(),
        userRole: z.string().optional(),
        available: z.boolean().optional()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId,
      region: ctx.auth.region
    });
    let current = await client.getCurrentUser();
    let id = current.id ?? current._id;
    return {
      output: {
        user: {
          id: typeof id === 'string' ? id : undefined,
          email: current.email ?? undefined,
          firstName: current.firstName ?? undefined,
          lastName: current.lastName ?? undefined,
          userType: current.userType ?? undefined,
          userRole: current.userRole ?? undefined,
          available: current.available ?? undefined
        }
      },
      message: `Retrieved the authenticated Gleap identity.`
    };
  })
  .build();
