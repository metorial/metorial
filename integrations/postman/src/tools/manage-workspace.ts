import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWorkspaceTool = SlateTool.create(spec, {
  name: 'Manage Workspace',
  key: 'manage_workspace',
  description: `Create, update, or delete a Postman workspace. Use **action** to specify the operation. When creating, provide a name and type. When updating, provide the workspace ID and fields to change. When deleting, provide only the workspace ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      workspaceId: z.string().optional().describe('Required for update and delete'),
      name: z.string().optional().describe('Workspace name (required for create)'),
      type: z
        .enum(['personal', 'team', 'private', 'public', 'partner'])
        .optional()
        .describe('Workspace type (required for create)'),
      description: z.string().optional().describe('Workspace description')
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, workspaceId, name, type, description } = ctx.input;

    if (action === 'create') {
      if (!name || !type)
        throw new Error('Name and type are required when creating a workspace.');
      let result = await client.createWorkspace({ name, type, description });
      return {
        output: { workspaceId: result.id, name: result.name },
        message: `Created workspace **"${result.name}"**.`
      };
    }

    if (action === 'update') {
      if (!workspaceId) throw new Error('workspaceId is required for update.');
      let result = await client.updateWorkspace(workspaceId, { name, type, description });
      return {
        output: { workspaceId: result.id, name: result.name },
        message: `Updated workspace **"${result.name}"**.`
      };
    }

    if (!workspaceId) throw new Error('workspaceId is required for delete.');
    let result = await client.deleteWorkspace(workspaceId);
    return {
      output: { workspaceId: result.id, name: undefined },
      message: `Deleted workspace **${workspaceId}**.`
    };
  })
  .build();
