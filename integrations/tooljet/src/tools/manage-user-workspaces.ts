import { pickDefined, SlateTool } from 'slates';
import { Client } from '../lib/client';
import { mappedUser, userSchema, workspaceId } from '../lib/schemas';
import { fail, id, type Row, z } from '../lib/validation';
import { spec } from '../spec';

const group = z.object({ groupName: z.string().optional(), groupId: z.string().optional() });
export const manageUserWorkspaces = SlateTool.create(spec, {
  name: 'Manage User Workspaces',
  key: 'manage_user_workspaces',
  description:
    'Replace the complete workspace membership set or update one relation. Discover IDs with list_workspaces. Explicit empty replaceAll removes every membership; omitted workspaces never implies removal.',
  instructions: [
    'replaceAll requires native ADMIN or MEMBER role, active/archived status and group UUIDs. Native PUT uses uppercase status values; names alone are not valid group locators for this route.',
    'No compare-and-swap is available. Coordinate concurrent membership changes; the request may take effect before readback fails.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      userId: z.string(),
      mode: z.enum(['replaceAll', 'updateOne']),
      workspaces: z
        .array(
          z.object({
            workspaceId,
            workspaceName: z.string().optional(),
            status: z.enum(['active', 'archived']).optional(),
            role: z
              .enum(['ADMIN', 'MEMBER'])
              .optional()
              .describe('Required by native replaceAll. Do not infer role from a group name.'),
            groups: z.array(group).optional()
          })
        )
        .optional(),
      targetWorkspaceId: workspaceId.optional(),
      updateStatus: z.enum(['active', 'archived']).optional(),
      updateGroups: z.array(group).optional()
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
    let body: Row | Row[];
    if (ctx.input.mode === 'replaceAll') {
      if (ctx.input.workspaces === undefined)
        fail(
          'Provide workspaces explicitly; use [] only when intentionally removing all memberships.'
        );
      if (
        ctx.input.targetWorkspaceId !== undefined ||
        ctx.input.updateStatus !== undefined ||
        ctx.input.updateGroups !== undefined
      )
        fail('Do not mix updateOne fields with replaceAll.');
      const seen = new Set<string>();
      body = ctx.input.workspaces.map(w => {
        const wid = id(w.workspaceId, 'workspace UUID');
        if (seen.has(wid)) fail('Workspace assignments must have unique UUIDs.');
        seen.add(wid);
        if (w.role === undefined || w.status === undefined)
          fail(
            'Each replaceAll assignment requires role ADMIN/MEMBER and status active/archived. Discover and specify the intended values; no role is inferred.'
          );
        const groups = w.groups?.map(g => {
          if (!g.groupId)
            fail(
              'replaceAll requires a group UUID for every group; discover IDs with list_workspaces.'
            );
          return { id: id(g.groupId, 'group UUID') };
        });
        return pickDefined({
          id: wid,
          name: w.workspaceName,
          role: w.role,
          status: w.status.toUpperCase(),
          groups
        });
      });
    } else {
      if (!ctx.input.targetWorkspaceId)
        fail('Provide targetWorkspaceId from list_workspaces for updateOne.');
      if (ctx.input.workspaces !== undefined) fail('Do not mix workspaces with updateOne.');
      if (ctx.input.updateStatus === undefined && ctx.input.updateGroups === undefined)
        fail('Provide updateStatus or updateGroups for updateOne.');
      body = pickDefined({
        status: ctx.input.updateStatus,
        groups: ctx.input.updateGroups?.map(g => {
          if (!g.groupId && !g.groupName) fail('Each group requires a UUID or name.');
          return pickDefined({ id: g.groupId, name: g.groupName });
        })
      });
    }
    const client = new Client(ctx.auth, ctx.config),
      before = await client.getUser(ctx.input.userId);
    if (ctx.input.mode === 'replaceAll')
      await client.replaceUserWorkspaces(before.id, body as Row[]);
    else
      await client.updateUserWorkspace(
        before.id,
        id(ctx.input.targetWorkspaceId, 'workspace UUID'),
        body as Row
      );
    let after: Awaited<ReturnType<Client['getUser']>>;
    try {
      after = await client.getUser(before.id);
    } catch {
      fail(
        'ToolJet accepted the membership request but exact readback failed. Reconcile current memberships before retrying.',
        'update_unverified',
        { userId: before.id }
      );
    }
    return {
      output: {
        success: true,
        user: mappedUser(after),
        verification: 'request_accepted_native_memberships_returned'
      },
      message:
        'ToolJet accepted the membership request; inspect the returned current native assignments.'
    };
  })
  .build();
