import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEnvironmentTool = SlateTool.create(spec, {
  name: 'Manage Environment',
  key: 'manage_environment',
  description: `Create, update, or delete a Postman environment. Environments hold variable sets for scoping API requests to different contexts (e.g., dev, staging, production).`,
  instructions: [
    'Updating replaces the entire variable set — include all variables you want to keep.',
    'Each variable can have type "default" or "secret". Secret values are masked in the Postman UI.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      environmentId: z.string().optional().describe('Required for update and delete'),
      workspaceId: z.string().optional().describe('Workspace ID (used when creating)'),
      name: z.string().optional().describe('Environment name (required for create)'),
      values: z
        .array(
          z.object({
            key: z.string().describe('Variable name'),
            value: z.string().describe('Variable value'),
            enabled: z.boolean().optional().describe('Whether the variable is active'),
            type: z.enum(['default', 'secret']).optional().describe('Variable type')
          })
        )
        .optional()
        .describe('Environment variables')
    })
  )
  .output(
    z.object({
      environmentId: z.string(),
      name: z.string().optional(),
      uid: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, environmentId, workspaceId, name, values } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating an environment.');
      let result = await client.createEnvironment({ name, values }, workspaceId);
      return {
        output: { environmentId: result.id, name: result.name, uid: result.uid },
        message: `Created environment **"${result.name}"**.`
      };
    }

    if (action === 'update') {
      if (!environmentId) throw new Error('environmentId is required for update.');
      let result = await client.updateEnvironment(environmentId, { name, values });
      return {
        output: { environmentId: result.id, name: result.name, uid: result.uid },
        message: `Updated environment **"${result.name ?? environmentId}"**.`
      };
    }

    if (!environmentId) throw new Error('environmentId is required for delete.');
    let result = await client.deleteEnvironment(environmentId);
    return {
      output: { environmentId: result.id, name: undefined, uid: result.uid },
      message: `Deleted environment **${environmentId}**.`
    };
  })
  .build();
