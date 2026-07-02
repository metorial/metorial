import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

let envVarSchema = z.object({
  envVarId: z.string().describe('Environment variable identifier'),
  key: z.string().describe('Variable name'),
  value: z.string().optional().describe('Variable value (may be encrypted)'),
  decrypted: z.boolean().optional().describe('Whether the value is decrypted'),
  createdAt: z.number().optional().describe('Creation timestamp'),
  updatedAt: z.number().optional().describe('Last update timestamp')
});

export let listEnvVarsTool = SlateTool.create(spec, {
  name: 'List Environment Variables',
  key: 'list_env_vars',
  description: `Retrieve all environment variables for a V0 project. Optionally return decrypted values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to list environment variables for'),
      decrypted: z
        .boolean()
        .optional()
        .describe('Whether to return decrypted values (defaults to false)')
    })
  )
  .output(
    z.object({
      envVars: z.array(envVarSchema).describe('List of environment variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.listEnvVars(ctx.input.projectId, ctx.input.decrypted);

    let envVars = (result.data || []).map((v: any) => ({
      envVarId: v.id,
      key: v.key,
      value: v.value,
      decrypted: v.decrypted,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt
    }));

    return {
      output: { envVars },
      message: `Found **${envVars.length}** environment variable(s) for project ${ctx.input.projectId}.`
    };
  })
  .build();

export let createEnvVarsTool = SlateTool.create(spec, {
  name: 'Create Environment Variables',
  key: 'create_env_vars',
  description: `Create one or more environment variables for a V0 project. These variables are available across all chats in the project. Use upsert to update existing variables.`,
  constraints: ['Fails if a variable key already exists unless upsert is set to true.']
})
  .input(
    z.object({
      projectId: z.string().describe('Project to create environment variables for'),
      environmentVariables: z
        .array(
          z.object({
            key: z.string().describe('Variable name'),
            value: z.string().describe('Variable value')
          })
        )
        .describe('Environment variables to create'),
      upsert: z
        .boolean()
        .optional()
        .describe('If true, update existing variables instead of failing')
    })
  )
  .output(
    z.object({
      envVars: z.array(envVarSchema).describe('Created environment variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.createEnvVars(ctx.input.projectId, {
      environmentVariables: ctx.input.environmentVariables,
      upsert: ctx.input.upsert
    });

    let envVars = (result.data || []).map((v: any) => ({
      envVarId: v.id,
      key: v.key,
      value: v.value,
      decrypted: v.decrypted,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt
    }));

    return {
      output: { envVars },
      message: `Created **${envVars.length}** environment variable(s) for project ${ctx.input.projectId}.`
    };
  })
  .build();

export let updateEnvVarsTool = SlateTool.create(spec, {
  name: 'Update Environment Variables',
  key: 'update_env_vars',
  description: `Update the values of existing environment variables for a V0 project. Only the value can be changed; keys cannot be renamed.`
})
  .input(
    z.object({
      projectId: z.string().describe('Project containing the environment variables'),
      environmentVariables: z
        .array(
          z.object({
            envVarId: z.string().describe('ID of the environment variable to update'),
            value: z.string().describe('New value')
          })
        )
        .describe('Variables to update')
    })
  )
  .output(
    z.object({
      envVars: z.array(envVarSchema).describe('Updated environment variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.updateEnvVars(ctx.input.projectId, {
      environmentVariables: ctx.input.environmentVariables.map(v => ({
        id: v.envVarId,
        value: v.value
      }))
    });

    let envVars = (result.data || []).map((v: any) => ({
      envVarId: v.id,
      key: v.key,
      value: v.value,
      decrypted: v.decrypted,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt
    }));

    return {
      output: { envVars },
      message: `Updated **${envVars.length}** environment variable(s) for project ${ctx.input.projectId}.`
    };
  })
  .build();

export let deleteEnvVarsTool = SlateTool.create(spec, {
  name: 'Delete Environment Variables',
  key: 'delete_env_vars',
  description: `Delete one or more environment variables from a V0 project by their IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project containing the environment variables'),
      envVarIds: z.array(z.string()).describe('IDs of environment variables to delete')
    })
  )
  .output(
    z.object({
      deletedIds: z.array(z.string()).describe('IDs of deleted environment variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.deleteEnvVars(ctx.input.projectId, ctx.input.envVarIds);

    let deletedIds = (result.data || []).map((v: any) => v.id);

    return {
      output: { deletedIds },
      message: `Deleted **${deletedIds.length}** environment variable(s) from project ${ctx.input.projectId}.`
    };
  })
  .build();
