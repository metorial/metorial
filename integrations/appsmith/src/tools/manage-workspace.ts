import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let manageWorkspace = SlateTool.create(spec, {
  name: 'Manage Workspace',
  key: 'manage_workspace',
  description: `Create, update, or delete an Appsmith workspace. Can also retrieve workspace details and members. To create a workspace, provide a name. To update or delete, provide the workspace ID.`,
  instructions: [
    'To create: provide a name and set action to "create".',
    'To update: provide workspaceId, set action to "update", and include the fields to change.',
    'To delete: provide workspaceId and set action to "delete".',
    'To get details: provide workspaceId and set action to "get".',
    'To list members: provide workspaceId and set action to "get_members".'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'get', 'get_members'])
        .describe('The action to perform on the workspace.'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Required for update, delete, get, and get_members actions.'),
      name: z
        .string()
        .optional()
        .describe('Workspace name. Required for create, optional for update.'),
      website: z
        .string()
        .optional()
        .describe('Website URL to associate with the workspace (for update).')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().optional().describe('Workspace ID.'),
      name: z.string().optional().describe('Workspace name.'),
      slug: z.string().optional().describe('Workspace URL slug.'),
      members: z
        .array(
          z.object({
            userId: z.string().optional().describe('Member user ID.'),
            username: z.string().optional().describe('Member username/email.'),
            name: z.string().optional().describe('Member display name.'),
            roleName: z.string().optional().describe('Role assigned to the member.')
          })
        )
        .optional()
        .describe('Workspace members (for get_members action).'),
      deleted: z
        .boolean()
        .optional()
        .describe(
          'Whether Appsmith accepted archival of this workspace. This does not erase retained history.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const { action, workspaceId, name, website } = ctx.input;
    if (action === 'get_members')
      return {
        output: { workspaceId, members: await client.getWorkspaceMembers(workspaceId ?? '') },
        message: 'Retrieved native workspace members.'
      };
    if (action === 'delete') {
      const ws = await client.deleteWorkspace(workspaceId ?? '');
      return {
        output: { workspaceId: ws.id, deleted: true },
        message: 'Appsmith accepted workspace archival. Retained history is not erased.'
      };
    }
    const ws =
      action === 'create'
        ? await client.createWorkspace(name ?? '')
        : action === 'update'
          ? await client.updateWorkspace(workspaceId ?? '', { name, website })
          : await client.getWorkspace(workspaceId ?? '');
    return {
      output: { workspaceId: ws.id, name: ws.name, slug: ws.slug },
      message: `Workspace ${action} confirmed by native readback.`
    };
  })
  .build();
