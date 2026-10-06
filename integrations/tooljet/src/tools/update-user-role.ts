import { SlateTool } from 'slates';
import { Client } from '../lib/client';
import { mappedUser, userSchema, workspaceId } from '../lib/schemas';
import { fail, text, z } from '../lib/validation';
import { spec } from '../spec';
export const updateUserRole = SlateTool.create(spec, {
  name: 'Update User Role',
  key: 'update_user_role',
  description:
    'Request a role change in a workspace discovered with list_workspaces; identify the user with list_users. Native role restrictions, last-admin protection and owned-app transfer prerequisites apply.',
  tags: { destructive: true }
})
  .input(
    z.object({
      workspaceId,
      email: z.string(),
      newRole: z
        .string()
        .describe('Exact supported native role, for example admin, builder or end-user.')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      user: userSchema.optional(),
      verification: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    text(ctx.input.newRole, 'role');
    text(ctx.input.email, 'email');
    const client = new Client(ctx.auth, ctx.config),
      before = await client.getUser(ctx.input.email);
    if (!before.workspaces?.some(w => w.id === ctx.input.workspaceId))
      fail(
        'The user is not a member of this workspace. Check list_users and list_workspaces before changing roles.'
      );
    await client.updateUserRole(ctx.input.workspaceId, {
      newRole: ctx.input.newRole,
      email: before.email
    });
    let after: Awaited<ReturnType<Client['getUser']>>;
    try {
      after = await client.getUser(before.id);
    } catch {
      fail(
        'ToolJet accepted the role request but native readback failed. Reconcile the exact user/workspace before retrying.',
        'update_unverified',
        { userId: before.id, workspaceId: ctx.input.workspaceId }
      );
    }
    return {
      output: {
        success: true,
        user: mappedUser(after),
        verification: 'request_accepted_native_state_returned_role_not_independently_confirmed'
      },
      message:
        'ToolJet accepted the role request; current native membership state is returned for inspection.'
    };
  })
  .build();
