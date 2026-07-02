import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let managePlugins = SlateTool.create(spec, {
  name: 'Manage Plugins',
  key: 'manage_plugins',
  description: `List installed Jenkins plugins or install new plugins. Returns plugin names, versions, enabled/active status, and dependency information.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'install']).describe('Action to perform'),
      pluginId: z
        .string()
        .optional()
        .describe(
          'Plugin short name/ID to install (e.g. "git", "docker-workflow"). Required for "install".'
        )
    })
  )
  .output(
    z.object({
      plugins: z
        .array(
          z.object({
            shortName: z.string().describe('Plugin short name/ID'),
            longName: z.string().optional().describe('Plugin display name'),
            version: z.string().optional().describe('Installed version'),
            enabled: z.boolean().optional().describe('Whether the plugin is enabled'),
            active: z.boolean().optional().describe('Whether the plugin is active'),
            hasUpdate: z.boolean().optional().describe('Whether an update is available')
          })
        )
        .optional()
        .describe('List of installed plugins (for "list" action)'),
      installed: z
        .boolean()
        .optional()
        .describe('Whether the install request was sent (for "install" action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'install') {
      if (!ctx.input.pluginId) throw new Error('pluginId is required for install action');
      await client.installPlugin(ctx.input.pluginId);
      return {
        output: { installed: true, success: true },
        message: `Plugin **${ctx.input.pluginId}** installation initiated. A Jenkins restart may be required.`
      };
    }

    let data = await client.listPlugins();
    let plugins = (data.plugins || []).map((p: any) => ({
      shortName: p.shortName,
      longName: p.longName,
      version: p.version,
      enabled: p.enabled,
      active: p.active,
      hasUpdate: p.hasUpdate
    }));

    return {
      output: { plugins, success: true },
      message: `Found **${plugins.length}** installed plugin(s). ${plugins.filter((p: any) => p.hasUpdate).length} have updates available.`
    };
  })
  .build();
