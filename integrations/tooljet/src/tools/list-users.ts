import { SlateTool } from 'slates';
import { Client } from '../lib/client';
import { mappedUser, userSchema } from '../lib/schemas';
import { text, z } from '../lib/validation';
import { spec } from '../spec';
export const listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'List native users on the Enterprise self-hosted instance, optionally filtering groups or status. The public API returns an unpaginated collection; this integration refuses collections over its local 1,000-item safety bound.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      groupNames: z
        .string()
        .optional()
        .describe('Comma-separated group names, including custom groups.'),
      status: z
        .enum(['active', 'invited', 'archived', 'verified'])
        .optional()
        .describe('Optional documented native status filter.')
    })
  )
  .output(z.object({ users: z.array(userSchema) }))
  .handleInvocation(async ctx => {
    if (ctx.input.groupNames !== undefined) text(ctx.input.groupNames, 'group filter');
    const users = (
      await new Client(ctx.auth, ctx.config).listUsers(ctx.input.groupNames, ctx.input.status)
    ).map(mappedUser);
    return { output: { users }, message: `Returned ${users.length} native users.` };
  })
  .build();
