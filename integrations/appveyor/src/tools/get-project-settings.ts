import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let getProjectSettings = SlateTool.create(spec, {
  name: 'Get Project Settings',
  key: 'get_project_settings',
  description: `Retrieve project configuration settings. Supports returning settings as JSON or as YAML configuration, and can also return environment variables separately.`,
  instructions: [
    'Set format to "json" for the full settings object.',
    'Set format to "yaml" to get the appveyor.yml configuration.',
    'Set format to "envVars" to get only the environment variables.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountName: z.string().describe('Account name that owns the project'),
      projectSlug: z.string().describe('Project URL slug'),
      format: z
        .enum(['json', 'yaml', 'envVars'])
        .default('json')
        .describe('Output format for settings')
    })
  )
  .output(
    z.object({
      settings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Project settings as JSON'),
      yamlConfig: z.string().optional().describe('Project settings as YAML'),
      environmentVariables: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Project environment variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let { accountName, projectSlug, format } = ctx.input;

    switch (format) {
      case 'yaml': {
        let yaml = await client.getProjectSettingsYaml(accountName, projectSlug);
        return {
          output: { yamlConfig: yaml },
          message: `Retrieved YAML settings for **${accountName}/${projectSlug}**.`
        };
      }

      case 'envVars': {
        let settings = await client.getProjectSettings(accountName, projectSlug);
        let envVars = (settings as any)?.settings?.environmentVariables || [];
        return {
          output: { environmentVariables: envVars },
          message: `Retrieved **${envVars.length}** environment variable(s) for **${accountName}/${projectSlug}**.`
        };
      }

      default: {
        let settings = await client.getProjectSettings(accountName, projectSlug);
        return {
          output: { settings },
          message: `Retrieved settings for **${accountName}/${projectSlug}**.`
        };
      }
    }
  })
  .build();
