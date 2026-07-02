import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConfigurations = SlateTool.create(spec, {
  name: 'List Prompt Configurations',
  key: 'list_configurations',
  description: `List prompt configurations (managed prompts) in a project. Configurations can be filtered by environment and name. Use this to discover available prompts and their deployment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name. Falls back to the configured default project.'),
      environment: z
        .enum(['dev', 'staging', 'prod'])
        .optional()
        .describe('Filter by environment'),
      name: z.string().optional().describe('Filter by configuration name')
    })
  )
  .output(
    z.object({
      configurations: z
        .array(
          z.object({
            configurationId: z.string().describe('Configuration ID'),
            name: z.string().describe('Configuration name'),
            provider: z
              .string()
              .optional()
              .describe('LLM provider (e.g., "openai", "anthropic")'),
            type: z.string().optional().describe('Configuration type (LLM or pipeline)'),
            environments: z.array(z.string()).optional().describe('Active environments'),
            parameters: z
              .record(z.string(), z.any())
              .optional()
              .describe('Model parameters and prompt template'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of prompt configurations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;
    if (!project) {
      throw new Error('Project name is required.');
    }

    let data = await client.listConfigurations({
      project,
      env: ctx.input.environment,
      name: ctx.input.name
    });

    let configs = (Array.isArray(data) ? data : data.configurations || []).map((c: any) => ({
      configurationId: c._id || c.id,
      name: c.name,
      provider: c.provider,
      type: c.type,
      environments: c.env,
      parameters: c.parameters,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { configurations: configs },
      message: `Found **${configs.length}** configuration(s).`
    };
  })
  .build();

export let createConfiguration = SlateTool.create(spec, {
  name: 'Create Prompt Configuration',
  key: 'create_configuration',
  description: `Create a new prompt configuration (managed prompt) in a project. Configurations centralize prompt management with versioning and environment-based deployment.`,
  instructions: [
    'The "parameters" object should include at minimum "call_type" (chat/completion) and "model".',
    'You can include "hyperparameters" (temperature, max_tokens), "template", and "selectedFunctions" inside parameters.'
  ]
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name. Falls back to the configured default project.'),
      name: z.string().describe('Name for the configuration'),
      provider: z.string().describe('LLM provider (e.g., "openai", "anthropic")'),
      parameters: z
        .record(z.string(), z.any())
        .describe(
          'Model parameters including call_type, model, hyperparameters, and template'
        ),
      environments: z
        .array(z.string())
        .optional()
        .describe('Environments to deploy to (e.g., ["dev", "staging", "prod"])'),
      type: z
        .enum(['LLM', 'pipeline'])
        .optional()
        .default('LLM')
        .describe('Configuration type'),
      userProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('User property targeting rules')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the configuration was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;
    if (!project) {
      throw new Error('Project name is required.');
    }

    await client.createConfiguration({
      project,
      name: ctx.input.name,
      provider: ctx.input.provider,
      parameters: ctx.input.parameters,
      env: ctx.input.environments,
      type: ctx.input.type,
      user_properties: ctx.input.userProperties
    });

    return {
      output: { success: true },
      message: `Created configuration **${ctx.input.name}**.`
    };
  })
  .build();

export let updateConfiguration = SlateTool.create(spec, {
  name: 'Update Prompt Configuration',
  key: 'update_configuration',
  description: `Update an existing prompt configuration's parameters, environments, or other settings.`
})
  .input(
    z.object({
      configurationId: z.string().describe('ID of the configuration to update'),
      project: z
        .string()
        .optional()
        .describe('Project name. Falls back to the configured default project.'),
      name: z.string().describe('Configuration name'),
      provider: z.string().describe('LLM provider'),
      parameters: z.record(z.string(), z.any()).describe('Updated model parameters'),
      environments: z.array(z.string()).optional().describe('Updated environments'),
      type: z.enum(['LLM', 'pipeline']).optional().describe('Configuration type'),
      userProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('User property targeting rules')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;
    if (!project) {
      throw new Error('Project name is required.');
    }

    await client.updateConfiguration(ctx.input.configurationId, {
      project,
      name: ctx.input.name,
      provider: ctx.input.provider,
      parameters: ctx.input.parameters,
      env: ctx.input.environments,
      type: ctx.input.type,
      user_properties: ctx.input.userProperties
    });

    return {
      output: { success: true },
      message: `Updated configuration **${ctx.input.name}**.`
    };
  })
  .build();

export let deleteConfiguration = SlateTool.create(spec, {
  name: 'Delete Prompt Configuration',
  key: 'delete_configuration',
  description: `Delete a prompt configuration by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      configurationId: z.string().describe('ID of the configuration to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.deleteConfiguration(ctx.input.configurationId);

    return {
      output: { success: true },
      message: `Deleted configuration \`${ctx.input.configurationId}\`.`
    };
  })
  .build();
