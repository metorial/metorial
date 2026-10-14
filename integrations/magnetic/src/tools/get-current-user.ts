import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Retrieve the user associated with the connected Magnetic API token.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('ID of the authenticated user'),
      fullName: z.string().optional().describe('Full name of the authenticated user'),
      email: z.string().optional().describe('Email address of the authenticated user'),
      role: z.string().optional().describe('Role of the authenticated user')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new MagneticClient({ token: ctx.auth.token }).getUser();
    return {
      output: {
        userId: String(user.id),
        fullName: typeof user.fullName === 'string' ? user.fullName : undefined,
        email: typeof user.email === 'string' ? user.email : undefined,
        role: typeof user.role === 'string' ? user.role : undefined
      },
      message: `Retrieved the connected Magnetic user (ID: ${user.id}).`
    };
  })
  .build();
