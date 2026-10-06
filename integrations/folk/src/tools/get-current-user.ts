import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Identifies the authenticated workspace user associated with the Folk API key. This returns a workspace user, not a contact or a workspace identifier.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ userId: z.string(), fullName: z.string(), email: z.string() }))
  .handleInvocation(async ctx => {
    const user = await new Client({ token: ctx.auth.token }).getCurrentUser();
    return {
      output: { userId: user.id, fullName: user.fullName, email: user.email },
      message: `Authenticated as ${user.fullName}.`
    };
  })
  .build();
