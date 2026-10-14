import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let getProjectSettings = SlateTool.create(spec, {
  name: 'Get Project Settings',
  key: 'get_project_settings',
  description: `Retrieve project configuration settings. Supports returning settings as JSON or downloading YAML configuration, and can also return environment variables separately.`,
  instructions: [
    'Set format to "json" for the full settings object.',
    'Set format to "yaml" to download the appveyor.yml configuration.',
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
      fileName: z.string().optional().describe('Name of the downloadable YAML file'),
      downloadUrl: z
        .string()
        .optional()
        .describe('Provider endpoint for the YAML configuration'),
      environmentVariables: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Project environment variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.auth.accountName ?? (ctx.config as { accountName?: string }).accountName
    });

    let { accountName, projectSlug, format } = ctx.input;

    switch (format) {
      case 'yaml': {
        let downloadUrl = client.getProjectSettingsYamlUrl(accountName, projectSlug);
        let fileName = 'appveyor.yml';
        let file = await client.downloadFile(downloadUrl);
        await ctx.addAttachment({
          type: 'content',
          content: new Response(new Uint8Array(file.bytes), {
            headers: { 'Content-Type': 'application/yaml' }
          }),
          filename: fileName,
          mimeType: 'application/yaml'
        });
        return {
          output: { yamlConfig: file.text, fileName, downloadUrl },
          message: `Prepared YAML settings for **${accountName}/${projectSlug}** for download.`
        };
      }

      case 'envVars': {
        let envVars = await client.getProjectEnvironmentVariables(accountName, projectSlug);
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
