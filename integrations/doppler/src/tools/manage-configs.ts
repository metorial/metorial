import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

let configSchema = z.object({
  name: z.string().optional().describe('Config name'),
  root: z.boolean().optional().describe('Whether this is a root config'),
  locked: z.boolean().optional().describe('Whether the config is locked'),
  environment: z.string().optional().describe('Environment the config belongs to'),
  project: z.string().optional().describe('Project the config belongs to'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  initialFetchAt: z.string().optional().describe('First fetch timestamp'),
  lastFetchAt: z.string().optional().describe('Last fetch timestamp')
});

export let manageConfigs = SlateTool.create(spec, {
  name: 'Manage Configs',
  key: 'manage_configs',
  description: `List, create, update, delete, clone, lock, or unlock configs within a Doppler project. Configs hold the actual secret values for an environment. Supports branch configs, cloning, and locking to prevent modifications.`,
  instructions: [
    'Use action "list" to see all configs in a project (optionally filtered by environment).',
    'Use action "get" to retrieve a specific config.',
    'Use action "create" to add a new branch config under an environment.',
    'Use action "update" to rename a config.',
    'Use action "clone" to duplicate a config with a new name.',
    'Use action "lock" or "unlock" to prevent or allow modifications to a config.',
    'Use action "delete" to permanently remove a config.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      project: z.string().describe('Project slug'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'clone', 'lock', 'unlock'])
        .describe('Action to perform'),
      config: z
        .string()
        .optional()
        .describe('Config name (required for get, update, delete, clone, lock, unlock)'),
      environment: z
        .string()
        .optional()
        .describe('Environment slug (for list filtering or create)'),
      name: z.string().optional().describe('New config name (for create, update, or clone)'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Items per page for listing')
    })
  )
  .output(
    z.object({
      configs: z.array(configSchema).optional().describe('List of configs'),
      config: configSchema.optional().describe('Single config details'),
      page: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    let mapConfig = (c: any) => ({
      name: c.name,
      root: c.root,
      locked: c.locked,
      environment: c.environment,
      project: c.project,
      createdAt: c.created_at,
      initialFetchAt: c.initial_fetch_at,
      lastFetchAt: c.last_fetch_at
    });

    if (ctx.input.action === 'list') {
      let result = await client.listConfigs(ctx.input.project, {
        environment: ctx.input.environment,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      return {
        output: {
          configs: result.configs.map(mapConfig),
          page: result.page
        },
        message: `Found **${result.configs.length}** configs in project **${ctx.input.project}**${ctx.input.environment ? ` (environment: ${ctx.input.environment})` : ''}.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.config) throw new Error('config is required for "get" action');

      let config = await client.getConfig(ctx.input.project, ctx.input.config);

      return {
        output: { config: mapConfig(config) },
        message: `Retrieved config **${config.name}** from project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.environment)
        throw new Error('environment is required for "create" action');
      if (!ctx.input.name) throw new Error('name is required for "create" action');

      let config = await client.createConfig(
        ctx.input.project,
        ctx.input.environment,
        ctx.input.name
      );

      return {
        output: { config: mapConfig(config) },
        message: `Created config **${config.name}** in project **${ctx.input.project}** / environment **${ctx.input.environment}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.config) throw new Error('config is required for "update" action');
      if (!ctx.input.name) throw new Error('name is required for "update" action');

      let config = await client.updateConfig(
        ctx.input.project,
        ctx.input.config,
        ctx.input.name
      );

      return {
        output: { config: mapConfig(config) },
        message: `Renamed config **${ctx.input.config}** to **${config.name}** in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'clone') {
      if (!ctx.input.config) throw new Error('config is required for "clone" action');
      if (!ctx.input.name) throw new Error('name is required for "clone" action');

      let config = await client.cloneConfig(
        ctx.input.project,
        ctx.input.config,
        ctx.input.name
      );

      return {
        output: { config: mapConfig(config) },
        message: `Cloned config **${ctx.input.config}** as **${config.name}** in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'lock') {
      if (!ctx.input.config) throw new Error('config is required for "lock" action');

      let config = await client.lockConfig(ctx.input.project, ctx.input.config);

      return {
        output: { config: mapConfig(config) },
        message: `Locked config **${ctx.input.config}** in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'unlock') {
      if (!ctx.input.config) throw new Error('config is required for "unlock" action');

      let config = await client.unlockConfig(ctx.input.project, ctx.input.config);

      return {
        output: { config: mapConfig(config) },
        message: `Unlocked config **${ctx.input.config}** in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.config) throw new Error('config is required for "delete" action');

      await client.deleteConfig(ctx.input.project, ctx.input.config);

      return {
        output: {},
        message: `Deleted config **${ctx.input.config}** from project **${ctx.input.project}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
