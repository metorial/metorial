import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { vercelServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageEnvVarsTool = SlateTool.create(spec, {
  name: 'Manage Environment Variables',
  key: 'manage_env_vars',
  description: `List, create, update, or delete environment variables for a Vercel project. Variables can be scoped to production, preview, and/or development environments. Supports encrypted and plain text values.`,
  instructions: [
    'Use action "list" to retrieve all environment variables for a project.',
    'Use action "create" to add a new environment variable (use upsert to update if it already exists).',
    'Use action "update" to modify an existing environment variable by its ID.',
    'Use action "delete" to remove an environment variable by its ID.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      projectIdOrName: z.string().describe('Project ID or name'),
      envVarId: z
        .string()
        .optional()
        .describe('Environment variable ID (required for update and delete)'),
      key: z.string().optional().describe('Variable name (required for create)'),
      value: z
        .string()
        .optional()
        .describe('Variable value (required for create, optional for update)'),
      target: z
        .array(z.enum(['production', 'preview', 'development']))
        .optional()
        .describe('Target environments (required for create)'),
      type: z
        .enum(['plain', 'encrypted', 'secret', 'sensitive'])
        .optional()
        .describe('Variable type (default: plain)'),
      gitBranch: z.string().optional().describe('Git branch to scope the variable to'),
      comment: z.string().optional().describe('Comment or description for the variable'),
      upsert: z
        .boolean()
        .optional()
        .describe('If true, update existing variable instead of failing (for create)')
    })
  )
  .output(
    z.object({
      envVars: z
        .array(
          z.object({
            envVarId: z.string().describe('Environment variable ID'),
            key: z.string().describe('Variable name'),
            value: z.string().optional().describe('Variable value (may be encrypted)'),
            target: z.array(z.string()).optional().describe('Target environments'),
            type: z.string().optional().describe('Variable type'),
            gitBranch: z.string().optional().nullable().describe('Git branch scope')
          })
        )
        .optional()
        .describe('List of environment variables (for list action)'),
      envVar: z
        .object({
          envVarId: z.string().describe('Environment variable ID'),
          key: z.string().describe('Variable name'),
          target: z.array(z.string()).optional().describe('Target environments'),
          type: z.string().optional().describe('Variable type')
        })
        .optional()
        .describe('Created/updated environment variable'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action, projectIdOrName } = ctx.input;

    if (action === 'list') {
      let result = await client.listEnvVars(projectIdOrName);
      let envVars = (result.envs || []).map((e: any) => ({
        envVarId: e.id,
        key: e.key,
        value: e.value,
        target: e.target,
        type: e.type,
        gitBranch: e.gitBranch || null
      }));
      return {
        output: { envVars, success: true },
        message: `Found **${envVars.length}** environment variable(s) for project "${projectIdOrName}".`
      };
    }

    if (action === 'create') {
      if (!ctx.input.key || !ctx.input.value || !ctx.input.target) {
        throw vercelServiceError('key, value, and target are required for create');
      }
      let result = await client.createEnvVar(
        projectIdOrName,
        {
          key: ctx.input.key,
          value: ctx.input.value,
          target: ctx.input.target,
          type: ctx.input.type || 'plain',
          gitBranch: ctx.input.gitBranch,
          comment: ctx.input.comment
        },
        ctx.input.upsert
      );

      let created = result.created || result;
      let envData = Array.isArray(created) ? created[0] : created;

      return {
        output: {
          envVar: {
            envVarId: envData?.id || 'created',
            key: ctx.input.key,
            target: ctx.input.target,
            type: ctx.input.type || 'plain'
          },
          success: true
        },
        message: `Created environment variable **${ctx.input.key}** for project "${projectIdOrName}".`
      };
    }

    if (action === 'update') {
      if (!ctx.input.envVarId) throw vercelServiceError('envVarId is required for update');
      let data: any = {};
      if (ctx.input.value !== undefined) data.value = ctx.input.value;
      if (ctx.input.target) data.target = ctx.input.target;
      if (ctx.input.type) data.type = ctx.input.type;
      if (ctx.input.gitBranch) data.gitBranch = ctx.input.gitBranch;
      if (ctx.input.comment) data.comment = ctx.input.comment;

      let result = await client.updateEnvVar(projectIdOrName, ctx.input.envVarId, data);

      return {
        output: {
          envVar: {
            envVarId: result.id || ctx.input.envVarId,
            key: result.key || '',
            target: result.target,
            type: result.type
          },
          success: true
        },
        message: `Updated environment variable **${result.key || ctx.input.envVarId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.envVarId) throw vercelServiceError('envVarId is required for delete');
      await client.deleteEnvVar(projectIdOrName, ctx.input.envVarId);
      return {
        output: { success: true },
        message: `Deleted environment variable **${ctx.input.envVarId}**.`
      };
    }

    throw vercelServiceError(`Unknown action: ${action}`);
  })
  .build();
