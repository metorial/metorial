import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContextEnvVars = SlateTool.create(spec, {
  name: 'Manage Context Environment Variables',
  key: 'manage_context_env_vars',
  description: `List, set, or delete environment variables within a CircleCI context. Context env vars are shared across all projects that use the context.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      contextId: z.string().describe('The UUID of the context'),
      action: z.enum(['list', 'set', 'delete']).describe('Action to perform'),
      name: z
        .string()
        .optional()
        .describe('Name of the environment variable (required for set/delete)'),
      value: z
        .string()
        .optional()
        .describe('Value of the environment variable (required for set)')
    })
  )
  .output(
    z.object({
      envVars: z
        .array(
          z.object({
            variable: z.string(),
            contextId: z.string(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional(),
      updated: z
        .object({
          variable: z.string(),
          contextId: z.string(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listContextEnvVars(ctx.input.contextId);
      let envVars = (result.items || []).map((e: any) => ({
        variable: e.variable,
        contextId: e.context_id,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      }));
      return {
        output: { envVars },
        message: `Found **${envVars.length}** environment variable(s) in context \`${ctx.input.contextId}\`.`
      };
    }

    if (ctx.input.action === 'set') {
      if (!ctx.input.name || !ctx.input.value) {
        throw new Error(
          'Both name and value are required to set a context environment variable.'
        );
      }
      let result = await client.setContextEnvVar(
        ctx.input.contextId,
        ctx.input.name,
        ctx.input.value
      );
      return {
        output: {
          updated: {
            variable: result.variable,
            contextId: result.context_id,
            createdAt: result.created_at,
            updatedAt: result.updated_at
          }
        },
        message: `Environment variable **${ctx.input.name}** set in context \`${ctx.input.contextId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.name) {
        throw new Error('Name is required to delete a context environment variable.');
      }
      await client.deleteContextEnvVar(ctx.input.contextId, ctx.input.name);
      return {
        output: { deleted: true },
        message: `Environment variable **${ctx.input.name}** deleted from context \`${ctx.input.contextId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
