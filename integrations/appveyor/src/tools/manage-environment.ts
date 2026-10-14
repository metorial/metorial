import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let manageEnvironment = SlateTool.create(spec, {
  name: 'Manage Environment',
  key: 'manage_environment',
  description: `Create, list, update, or delete deployment environments. Environments are targets for deploying builds, supporting providers like Web Deploy, FTP, Azure, AWS S3, and more.`,
  instructions: [
    'For **list**: no additional parameters needed.',
    'For **get**: provide environmentId to get environment settings.',
    'For **create**: provide environmentName and provider. Optionally provide providerSettings and environmentVariables.',
    'For **update**: provide the full environment settings object in environmentSettings.',
    'For **delete**: provide environmentId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      environmentId: z
        .number()
        .optional()
        .describe('Deployment environment ID (required for get, delete)'),
      environmentName: z
        .string()
        .optional()
        .describe('Environment name (required for create)'),
      provider: z
        .string()
        .optional()
        .describe('Deployment provider type (required for create)'),
      providerSettings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Provider settings keyed by name. Values may be plain values or objects with value and isEncrypted fields.'
        ),
      environmentVariables: z
        .array(
          z.object({
            name: z.string().describe('Variable name'),
            value: z.string().describe('Variable value'),
            isEncrypted: z.boolean().optional().describe('Whether the value is encrypted')
          })
        )
        .optional()
        .describe('Environment variables'),
      environmentSettings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full environment settings for update')
    })
  )
  .output(
    z.object({
      environments: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of environments'),
      environment: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Environment details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.auth.accountName ?? (ctx.config as { accountName?: string }).accountName
    });

    switch (ctx.input.action) {
      case 'list': {
        let environments = await client.listEnvironments();
        return {
          output: { environments, success: true },
          message: `Found **${environments.length}** environment(s).`
        };
      }

      case 'get': {
        if (ctx.input.environmentId === undefined) {
          throw createApiServiceError('environmentId is required for get');
        }
        let environment = await client.getEnvironmentSettings(ctx.input.environmentId);
        return {
          output: { environment, success: true },
          message: `Retrieved settings for environment **${ctx.input.environmentId}**.`
        };
      }

      case 'create': {
        if (!ctx.input.environmentName || !ctx.input.provider) {
          throw createApiServiceError('environmentName and provider are required for create');
        }
        let settings: Record<string, unknown> = {};
        if (ctx.input.providerSettings) {
          settings.providerSettings = Object.entries(ctx.input.providerSettings).map(
            ([name, value]) => ({
              name,
              value:
                typeof value === 'object' && value !== null && 'value' in value
                  ? value
                  : { value, isEncrypted: false }
            })
          );
        }
        if (ctx.input.environmentVariables) {
          settings.environmentVariables = ctx.input.environmentVariables.map(variable => ({
            name: variable.name,
            value: { value: variable.value, isEncrypted: variable.isEncrypted ?? false }
          }));
        }
        let environment = await client.addEnvironment({
          name: ctx.input.environmentName,
          provider: ctx.input.provider,
          settings: Object.keys(settings).length > 0 ? settings : undefined
        });
        return {
          output: { environment, success: true },
          message: `Created environment **${ctx.input.environmentName}**.`
        };
      }

      case 'update': {
        if (!ctx.input.environmentSettings) {
          throw createApiServiceError('environmentSettings is required for update');
        }
        let environment = await client.updateEnvironment(ctx.input.environmentSettings);
        return {
          output: { environment, success: true },
          message: `Updated environment settings.`
        };
      }

      case 'delete': {
        if (ctx.input.environmentId === undefined) {
          throw createApiServiceError('environmentId is required for delete');
        }
        await client.deleteEnvironment(ctx.input.environmentId);
        return {
          output: { success: true },
          message: `Deleted environment **${ctx.input.environmentId}**.`
        };
      }

      default:
        throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
