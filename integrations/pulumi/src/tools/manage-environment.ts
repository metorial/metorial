import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let manageEnvironment = SlateTool.create(spec, {
  name: 'Manage Environment',
  key: 'manage_environment',
  tags: { destructive: true },
  description: `Create, read, update, or delete a Pulumi ESC (Environments, Secrets, and Configuration) environment. Environments store secrets, config, and credentials as versioned YAML definitions.`,
  instructions: [
    'Reading provides the environment definition as a downloadable YAML file. Stored secrets remain encrypted.',
    'When updating, provide the full YAML content for the environment definition.'
  ]
})
  .input(
    z.object({
      organization: organizationInput,
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
      yamlContent: z
        .string()
        .optional()
        .describe(
          'Deprecated output; the definition is provided as a downloadable YAML file.'
        ),
      fileName: z.string().optional(),
      mimeType: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    let fileName: string | undefined;

    switch (ctx.input.action) {
      case 'create':
        await client.createEnvironment(org, ctx.input.projectName, ctx.input.environmentName);
        break;
      case 'read':
        await client.getEnvironment(org, ctx.input.projectName, ctx.input.environmentName);
        fileName = `${ctx.input.environmentName.replace(/[^a-zA-Z0-9._-]/g, '_')}.yaml`;
        await ctx.addAttachment({
          type: 'url',
          url: client.environmentUrl(org, ctx.input.projectName, ctx.input.environmentName),
          filename: fileName,
          mimeType: 'application/x-yaml',
          headers: {
            Authorization: `token ${ctx.auth.token}`,
            Accept: 'application/x-yaml',
            'Content-Type': 'application/json'
          }
        });
        break;
      case 'update':
        if (!ctx.input.yamlContent)
          throw createApiServiceError('yamlContent is required when updating an environment');
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
        fileName,
        mimeType: fileName ? 'application/x-yaml' : undefined
      },
      message: `**${ctx.input.action}** environment **${org}/${ctx.input.projectName}/${ctx.input.environmentName}** succeeded`
    };
  })
  .build();
