import { pickDefined, SlateTool } from 'slates';
import { Client } from '../lib/client';
import { mappedUser, userSchema } from '../lib/schemas';
import { fail, id, text, z } from '../lib/validation';
import { spec } from '../spec';

const assignment = z.object({
  workspaceName: z
    .string()
    .optional()
    .describe('Workspace name from list_workspaces; provide name or ID.'),
  workspaceId: z.string().optional().describe('Workspace UUID from list_workspaces.'),
  status: z.enum(['active', 'archived']).optional().default('active'),
  groups: z
    .array(z.object({ groupName: z.string().optional(), groupId: z.string().optional() }))
    .optional()
});
export const createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description:
    'Create a user on the Enterprise self-hosted instance with explicit workspace assignments. Omitting password sends an invite email. Returned status is native and may be invited even when active was requested.',
  instructions: [
    'Discover workspace and group IDs using list_workspaces. Native creation accepts active or invited; the legacy archived value is refused with guidance to archive after creation.',
    'User and invite/audit history may remain after archiving; do not blindly retry an uncertain creation.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string(),
      email: z.string(),
      password: z
        .string()
        .optional()
        .describe(
          'Password; omitting it sends an invitation. Server password policy applies.'
        ),
      status: z.enum(['active', 'archived', 'invited']).optional().default('active'),
      workspaces: z
        .array(assignment)
        .optional()
        .describe('Explicit native workspace assignments are required at invocation.')
    })
  )
  .output(userSchema.extend({ verification: z.string().optional() }))
  .handleInvocation(async ctx => {
    text(ctx.input.name, 'user name');
    text(ctx.input.email, 'user email');
    if (ctx.input.password !== undefined) text(ctx.input.password, 'password');
    if (ctx.input.status === 'archived')
      fail(
        'Native creation accepts active or invited. Create the user, then use update_user with archived.',
        'unsupported_status'
      );
    if (ctx.input.workspaces === undefined)
      fail(
        'Provide an explicit workspaces array using list_workspaces. It is required by the public API.'
      );
    const workspaces = ctx.input.workspaces.map(w => {
      if (!w.workspaceId && !w.workspaceName)
        fail('Each workspace needs a UUID or name from list_workspaces.');
      if (w.workspaceId) id(w.workspaceId, 'workspace UUID');
      if (w.workspaceName) text(w.workspaceName, 'workspace name');
      const groups = w.groups?.map(g => {
        if (!g.groupId && !g.groupName) fail('Each group needs a UUID or name.');
        return pickDefined({ id: g.groupId, name: g.groupName });
      });
      return pickDefined({
        id: w.workspaceId,
        name: w.workspaceName,
        status: w.status,
        groups
      });
    });
    const user = await new Client(ctx.auth, ctx.config).createUser(
      pickDefined({
        name: ctx.input.name,
        email: ctx.input.email,
        password: ctx.input.password,
        status: ctx.input.status,
        workspaces
      })
    );
    if (
      user.email.toLowerCase() !== ctx.input.email.toLowerCase() ||
      user.name !== ctx.input.name
    )
      fail(
        'Creation returned a contradictory native user. Reconcile the exact ID before any retry.',
        'creation_unverified',
        { userId: user.id }
      );
    return {
      output: { ...mappedUser(user), verification: 'native_creation_response' },
      message:
        'ToolJet returned the created user; inspect the native invitation and membership state.'
    };
  })
  .build();
