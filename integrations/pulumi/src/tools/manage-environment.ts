import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEnvironment = SlateTool.create(spec, {
  name: 'Manage Environment',
  key: 'manage_environment',
  description: `Create, read, update, or delete a Pulumi ESC (Environments, Secrets, and Configuration) environment. Environments store secrets, config, and credentials as versioned YAML definitions.`,
  instructions: [
    'When reading, returns the YAML definition of the environment.',
    'When updating, provide the full YAML content for the environment definition.'
  ]
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      projectName: z.string().describe('ESC project name'),
      environmentName: z.string().describe('Environment name'),
      action: z.enum(['create', 'read', 'update', 'delete']).describe('Action to perform'),
      yamlContent: z
        .string()
        .optional()
        .describe('YAML content for the environment (required for update)')
    })
  )
  .output(
    z.object({
      action: z.string(),
      environmentName: z.string(),
      projectName: z.string(),
      yamlContent: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    let yamlContent: string | undefined;

    switch (ctx.input.action) {
      case 'create':
        await client.createEnvironment(org, ctx.input.projectName, ctx.input.environmentName);
        break;
      case 'read':
        yamlContent = await client.getEnvironment(
          org,
          ctx.input.projectName,
          ctx.input.environmentName
        );
        break;
      case 'update':
        if (!ctx.input.yamlContent)
          throw new Error('yamlContent is required when updating an environment');
        await client.updateEnvironment(
          org,
          ctx.input.projectName,
          ctx.input.environmentName,
          ctx.input.yamlContent
        );
        break;
      case 'delete':
        await client.deleteEnvironment(org, ctx.input.projectName, ctx.input.environmentName);
        break;
    }

    return {
      output: {
        action: ctx.input.action,
        environmentName: ctx.input.environmentName,
        projectName: ctx.input.projectName,
        yamlContent: typeof yamlContent === 'string' ? yamlContent : undefined
      },
      message: `**${ctx.input.action}** environment **${org}/${ctx.input.projectName}/${ctx.input.environmentName}** succeeded`
    };
  })
  .build();
