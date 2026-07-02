import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSecret = SlateTool.create(spec, {
  name: 'Manage Secret',
  key: 'manage_secret',
  description: `Create, get, update, delete, or list project secrets. Secrets store environment variables, build arguments, and secret files used by services and jobs.`,
  instructions: [
    'Use action "list" to see all secrets in a project.',
    'Use action "create" to add a new secret group with variables.',
    'Use action "get" to view secret details (values are not returned for security).',
    'Use action "update" to modify a secret group.',
    'Use action "delete" to remove a secret group.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete'])
        .describe('Operation to perform'),
      projectId: z.string().describe('Project ID the secret belongs to'),
      secretId: z
        .string()
        .optional()
        .describe('Secret group ID (required for get, update, delete)'),
      name: z.string().optional().describe('Secret group name (required for create)'),
      description: z.string().optional().describe('Secret group description'),
      secretType: z
        .enum(['environment-arguments', 'environment', 'arguments'])
        .optional()
        .describe('Secret type (required for create)'),
      priority: z.number().optional().describe('Priority 0-100 for override ordering'),
      variables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs of secret variables'),
      tags: z.array(z.string()).optional().describe('Tags for the secret group'),
      page: z.number().optional().describe('Page number for list pagination'),
      perPage: z.number().optional().describe('Results per page for list (max 100)')
    })
  )
  .output(
    z.object({
      secretId: z.string().optional().describe('Secret group ID'),
      name: z.string().optional().describe('Secret group name'),
      secretType: z.string().optional().describe('Secret type'),
      secrets: z
        .array(
          z.object({
            secretId: z.string().describe('Secret group ID'),
            name: z.string().describe('Secret group name'),
            secretType: z.string().describe('Secret type'),
            priority: z.number().describe('Priority value')
          })
        )
        .optional()
        .describe('List of secret groups'),
      deleted: z.boolean().optional().describe('Whether the secret was deleted'),
      hasNextPage: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action, projectId, secretId } = ctx.input;

    if (action === 'list') {
      let result = await client.listProjectSecrets(projectId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let secrets = (result.data?.secrets || []).map((s: any) => ({
        secretId: s.id,
        name: s.name,
        secretType: s.secretType,
        priority: s.priority
      }));
      return {
        output: {
          secrets,
          hasNextPage: result.pagination.hasNextPage
        },
        message: `Found **${secrets.length}** secret group(s) in project **${projectId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for creating a secret');
      if (!ctx.input.secretType)
        throw new Error('secretType is required for creating a secret');
      let result = await client.createProjectSecret(projectId, {
        name: ctx.input.name,
        description: ctx.input.description,
        secretType: ctx.input.secretType,
        priority: ctx.input.priority,
        tags: ctx.input.tags,
        variables: ctx.input.variables
      });
      return {
        output: {
          secretId: result?.id,
          name: result?.name,
          secretType: result?.secretType
        },
        message: `Secret group **${ctx.input.name}** created.`
      };
    }

    if (action === 'get') {
      if (!secretId) throw new Error('secretId is required');
      let result = await client.getProjectSecret(projectId, secretId);
      return {
        output: {
          secretId: result?.id,
          name: result?.name,
          secretType: result?.secretType
        },
        message: `Retrieved secret group **${result?.name}**.`
      };
    }

    if (action === 'update') {
      if (!secretId) throw new Error('secretId is required for update');
      let updateData: any = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      if (ctx.input.priority !== undefined) updateData.priority = ctx.input.priority;
      if (ctx.input.variables) updateData.variables = ctx.input.variables;
      if (ctx.input.tags) updateData.tags = ctx.input.tags;
      let result = await client.updateProjectSecret(projectId, secretId, updateData);
      return {
        output: {
          secretId: result?.id || secretId,
          name: result?.name,
          secretType: result?.secretType
        },
        message: `Secret group **${secretId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!secretId) throw new Error('secretId is required for delete');
      await client.deleteProjectSecret(projectId, secretId);
      return {
        output: {
          secretId,
          deleted: true
        },
        message: `Secret group **${secretId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
