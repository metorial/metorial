import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { oktaServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageGroupTool = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Create, update, or delete an Okta group. Use this to manage group lifecycle and profile attributes.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      groupId: z.string().optional().describe('Group ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Group name (required for create, optional for update)'),
      description: z.string().optional().describe('Group description')
    })
  )
  .output(
    z.object({
      groupId: z.string().optional().describe('ID of the affected group'),
      name: z.string().optional(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let { action, groupId, name, description } = ctx.input;

    if (action === 'create') {
      if (!name) throw oktaServiceError('Group name is required for create action');
      let group = await client.createGroup({ name, description });
      return {
        output: { groupId: group.id, name: group.profile.name, action, success: true },
        message: `Created group **${group.profile.name}** (\`${group.id}\`).`
      };
    }

    if (action === 'update') {
      if (!groupId) throw oktaServiceError('Group ID is required for update action');
      let group = await client.updateGroup(groupId, { name, description });
      return {
        output: { groupId: group.id, name: group.profile.name, action, success: true },
        message: `Updated group **${group.profile.name}** (\`${group.id}\`).`
      };
    }

    if (action === 'delete') {
      if (!groupId) throw oktaServiceError('Group ID is required for delete action');
      await client.deleteGroup(groupId);
      return {
        output: { groupId, action, success: true },
        message: `Deleted group \`${groupId}\`.`
      };
    }

    throw oktaServiceError(`Unknown action: ${action}`);
  })
  .build();
