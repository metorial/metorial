import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete an AppVeyor CI/CD project. Supports adding new projects from repository providers, updating project settings (including YAML configuration and environment variables), updating the next build number, clearing build cache, and deleting projects.`,
  instructions: [
    'For **create**: provide repositoryProvider and repositoryName.',
    'For **update**: provide the full project settings object. Fields missing from the update will be reset to defaults.',
    'For **updateYaml**: provide accountName, projectSlug, and yamlConfig.',
    'For **updateEnvVars**: provide accountName, projectSlug, and environmentVariables array.',
    'For **updateBuildNumber**: provide accountName, projectSlug, and nextBuildNumber.',
    'For **clearCache**: provide accountName and projectSlug.',
    'For **delete**: provide accountName and projectSlug.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'update',
          'updateYaml',
          'updateEnvVars',
          'updateBuildNumber',
          'clearCache',
          'delete'
        ])
        .describe('Operation to perform'),
      accountName: z
        .string()
        .optional()
        .describe('Account name (required for most operations)'),
      projectSlug: z
        .string()
        .optional()
        .describe('Project slug (required for most operations)'),
      repositoryProvider: z
        .enum([
          'gitHub',
          'bitBucket',
          'vso',
          'gitLab',
          'kiln',
          'stash',
          'git',
          'mercurial',
          'subversion'
        ])
        .optional()
        .describe('Repository provider for creating a project'),
      repositoryName: z
        .string()
        .optional()
        .describe('Repository name for creating a project (e.g. owner/repo)'),
      projectSettings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full project settings object for update'),
      yamlConfig: z.string().optional().describe('YAML configuration string for updateYaml'),
      environmentVariables: z
        .array(
          z.object({
            name: z.string().describe('Variable name'),
            value: z.string().describe('Variable value (use encrypted values for secrets)'),
            isEncrypted: z.boolean().optional().describe('Whether the value is encrypted')
          })
        )
        .optional()
        .describe('Environment variables for updateEnvVars'),
      nextBuildNumber: z
        .number()
        .optional()
        .describe('Next build number for updateBuildNumber')
    })
  )
  .output(
    z.object({
      project: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Created or updated project details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let { action, accountName, projectSlug } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.repositoryProvider || !ctx.input.repositoryName) {
          throw new Error(
            'repositoryProvider and repositoryName are required for creating a project'
          );
        }
        let project = await client.addProject({
          repositoryProvider: ctx.input.repositoryProvider,
          repositoryName: ctx.input.repositoryName
        });
        return {
          output: { project, success: true },
          message: `Created project from **${ctx.input.repositoryName}**.`
        };
      }

      case 'update': {
        if (!ctx.input.projectSettings) {
          throw new Error('projectSettings is required for updating a project');
        }
        await client.updateProject(ctx.input.projectSettings);
        return {
          output: { success: true },
          message: `Updated project settings.`
        };
      }

      case 'updateYaml': {
        if (!accountName || !projectSlug || !ctx.input.yamlConfig) {
          throw new Error(
            'accountName, projectSlug, and yamlConfig are required for updateYaml'
          );
        }
        await client.updateProjectSettingsYaml(accountName, projectSlug, ctx.input.yamlConfig);
        return {
          output: { success: true },
          message: `Updated YAML configuration for **${accountName}/${projectSlug}**.`
        };
      }

      case 'updateEnvVars': {
        if (!accountName || !projectSlug || !ctx.input.environmentVariables) {
          throw new Error(
            'accountName, projectSlug, and environmentVariables are required for updateEnvVars'
          );
        }
        await client.updateProjectEnvironmentVariables(
          accountName,
          projectSlug,
          ctx.input.environmentVariables
        );
        return {
          output: { success: true },
          message: `Updated **${ctx.input.environmentVariables.length}** environment variable(s) for **${accountName}/${projectSlug}**.`
        };
      }

      case 'updateBuildNumber': {
        if (!accountName || !projectSlug || ctx.input.nextBuildNumber === undefined) {
          throw new Error(
            'accountName, projectSlug, and nextBuildNumber are required for updateBuildNumber'
          );
        }
        await client.updateProjectBuildNumber(
          accountName,
          projectSlug,
          ctx.input.nextBuildNumber
        );
        return {
          output: { success: true },
          message: `Set next build number to **${ctx.input.nextBuildNumber}** for **${accountName}/${projectSlug}**.`
        };
      }

      case 'clearCache': {
        if (!accountName || !projectSlug) {
          throw new Error('accountName and projectSlug are required for clearCache');
        }
        await client.deleteProjectBuildCache(accountName, projectSlug);
        return {
          output: { success: true },
          message: `Cleared build cache for **${accountName}/${projectSlug}**.`
        };
      }

      case 'delete': {
        if (!accountName || !projectSlug) {
          throw new Error('accountName and projectSlug are required for delete');
        }
        await client.deleteProject(accountName, projectSlug);
        return {
          output: { success: true },
          message: `Deleted project **${accountName}/${projectSlug}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  })
  .build();
