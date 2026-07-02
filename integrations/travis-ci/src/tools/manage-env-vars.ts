import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let manageEnvVars = SlateTool.create(spec, {
  name: 'Manage Environment Variables',
  key: 'manage_env_vars',
  description: `List, create, update, or delete environment variables for a Travis CI repository. Environment variables can be marked as public or private (encrypted). Private variable values are not returned by the API.`,
  instructions: [
    'When creating or updating a variable, set isPublic to true to make the value visible in build logs. Default is false (encrypted).'
  ]
})
  .input(
    z.object({
      repoSlugOrId: z.string().describe('Repository slug (e.g. "owner/repo") or numeric ID.'),
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform.'),
      envVarId: z
        .string()
        .optional()
        .describe('Environment variable ID. Required for update and delete actions.'),
      name: z
        .string()
        .optional()
        .describe('Variable name. Required for create, optional for update.'),
      value: z
        .string()
        .optional()
        .describe('Variable value. Required for create, optional for update.'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the variable value is publicly visible. Defaults to false.'),
      branch: z.string().optional().describe('Branch to restrict the variable to.')
    })
  )
  .output(
    z.object({
      envVars: z
        .array(
          z.object({
            envVarId: z.string().describe('Environment variable ID'),
            name: z.string().describe('Variable name'),
            value: z.string().nullable().describe('Variable value (null if private)'),
            isPublic: z.boolean().describe('Whether the value is public'),
            branch: z.string().nullable().optional().describe('Branch restriction')
          })
        )
        .optional()
        .describe('List of environment variables (for list action)'),
      envVar: z
        .object({
          envVarId: z.string().describe('Environment variable ID'),
          name: z.string().describe('Variable name'),
          value: z.string().nullable().describe('Variable value (null if private)'),
          isPublic: z.boolean().describe('Whether the value is public'),
          branch: z.string().nullable().optional().describe('Branch restriction')
        })
        .optional()
        .describe('Created or updated environment variable'),
      deleted: z.boolean().optional().describe('Whether the variable was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let mapEnvVar = (ev: any) => ({
      envVarId: ev.id,
      name: ev.name,
      value: ev.value ?? null,
      isPublic: ev.public,
      branch: ev.branch ?? null
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listEnvVars(ctx.input.repoSlugOrId);
        let envVars = (result.env_vars || []).map(mapEnvVar);
        return {
          output: { envVars },
          message: `Found **${envVars.length}** environment variables for **${ctx.input.repoSlugOrId}**.`
        };
      }

      case 'create': {
        let result = await client.createEnvVar(ctx.input.repoSlugOrId, {
          name: ctx.input.name!,
          value: ctx.input.value!,
          isPublic: ctx.input.isPublic,
          branch: ctx.input.branch
        });
        return {
          output: { envVar: mapEnvVar(result) },
          message: `Created environment variable **${ctx.input.name}** for **${ctx.input.repoSlugOrId}**.`
        };
      }

      case 'update': {
        let result = await client.updateEnvVar(ctx.input.repoSlugOrId, ctx.input.envVarId!, {
          name: ctx.input.name,
          value: ctx.input.value,
          isPublic: ctx.input.isPublic,
          branch: ctx.input.branch
        });
        return {
          output: { envVar: mapEnvVar(result) },
          message: `Updated environment variable **${result.name}** for **${ctx.input.repoSlugOrId}**.`
        };
      }

      case 'delete': {
        await client.deleteEnvVar(ctx.input.repoSlugOrId, ctx.input.envVarId!);
        return {
          output: { deleted: true },
          message: `Deleted environment variable **${ctx.input.envVarId}** from **${ctx.input.repoSlugOrId}**.`
        };
      }
    }
  })
  .build();
