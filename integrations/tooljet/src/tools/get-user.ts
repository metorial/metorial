import { SlateTool } from 'slates';
import { Client } from '../lib/client';
import { mappedUser, userSchema } from '../lib/schemas';
import { z } from '../lib/validation';
import { spec } from '../spec';
export const getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description:
    'Read a user by exact UUID or email; list_users discovers identifiers. A native empty array means no matching user, not a missing API route.',
  tags: { readOnly: true }
})
  .input(
    z.object({ identifier: z.string().describe('Exact user UUID or email from list_users.') })
  )
  .output(userSchema)
  .handleInvocation(async ctx => ({
    output: mappedUser(await new Client(ctx.auth, ctx.config).getUser(ctx.input.identifier)),
    message: 'Read the native user.'
  }))
  .build();
