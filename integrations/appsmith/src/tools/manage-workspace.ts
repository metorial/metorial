import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      deleted: z.boolean().optional().describe('Whether the workspace was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let { action, workspaceId, name, website } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required to create a workspace.');
      let ws = await client.createWorkspace(name);
      return {
        output: {
          workspaceId: ws.id,
          name: ws.name,
          slug: ws.slug
        },
        message: `Created workspace **${ws.name}** (ID: ${ws.id}).`
      };
    }

    if (!workspaceId) throw new Error('Workspace ID is required for this action.');

    if (action === 'get') {
      let ws = await client.getWorkspace(workspaceId);
      return {
        output: {
          workspaceId: ws.id,
          name: ws.name,
          slug: ws.slug
        },
        message: `Retrieved workspace **${ws.name}**.`
      };
    }

    if (action === 'get_members') {
      let members = await client.getWorkspaceMembers(workspaceId);
      let mapped = members.map((m: any) => ({
        userId: m.userId,
        username: m.username,
        name: m.name,
        roleName: m.roleName
      }));
      return {
        output: {
          workspaceId,
          members: mapped
        },
        message: `Found **${mapped.length}** member(s) in workspace.`
      };
    }

    if (action === 'update') {
      let updates: Record<string, any> = {};
      if (name) updates.name = name;
      if (website) updates.website = website;
      let ws = await client.updateWorkspace(workspaceId, updates);
      return {
        output: {
          workspaceId: ws.id,
          name: ws.name,
          slug: ws.slug
        },
        message: `Updated workspace **${ws.name}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteWorkspace(workspaceId);
      return {
        output: {
          workspaceId,
          deleted: true
        },
        message: `Deleted workspace ${workspaceId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
