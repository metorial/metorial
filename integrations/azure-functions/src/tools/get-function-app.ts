import { SlateTool } from 'slates';
import { z } from 'zod';
import { ArmClient } from '../lib/client';
import {
  getFunctionAppRuntimeStack,
  getFunctionAppVersion
} from '../lib/function-app-metadata';
import { spec } from '../spec';

export let getFunctionApp = SlateTool.create(spec, {
  name: 'Get Function App',
  key: 'get_function_app',
  description: `Get detailed information about a specific Azure Function App, including its configuration, state, hosting details, and site settings. Also retrieves the app's configuration (runtime stack, platform, etc.) and application settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the function app'),
      includeAppSettings: z
        .boolean()
        .default(false)
        .describe(
          'Whether to include application settings (environment variables) in the response'
        )
    })
  )
  .output(
    z.object({
      appName: z.string().describe('Name of the function app'),
      resourceId: z.string().describe('Full ARM resource ID'),
      location: z.string().describe('Azure region'),
      state: z.string().optional().describe('Current app state'),
      defaultHostName: z.string().optional().describe('Default hostname'),
      kind: z.string().optional().describe('Resource kind'),
      enabled: z.boolean().optional().describe('Whether the app is enabled'),
      httpsOnly: z.boolean().optional().describe('Whether HTTPS-only is configured'),
      clientAffinityEnabled: z.boolean().optional().describe('Client affinity enabled'),
      operatingSystem: z.string().optional().describe('Operating system (Windows/Linux)'),
      runtimeStack: z.string().optional().describe('Runtime stack configured'),
      functionsVersion: z.string().optional().describe('Azure Functions runtime version'),
      tags: z.record(z.string(), z.string()).optional().describe('Resource tags'),
      appSettings: z
        .record(z.string(), z.string())
        .optional()
        .describe('Application settings (if requested)'),
      siteConfig: z.any().optional().describe('Site configuration properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ArmClient({
      token: ctx.auth.token,
      subscriptionId: ctx.config.subscriptionId,
      resourceGroupName: ctx.config.resourceGroupName
    });

    ctx.info(`Getting function app: ${ctx.input.appName}`);

    let app = await client.getFunctionApp(ctx.input.appName);
    let config = await client.getConfiguration(ctx.input.appName);

    let appSettings: Record<string, string> | undefined;
    if (ctx.input.includeAppSettings) {
      let settingsResponse = await client.listApplicationSettings(ctx.input.appName);
      appSettings = settingsResponse.properties || {};
    }

    let isLinux =
      app.kind?.toLowerCase().includes('linux') || config.properties?.linuxFxVersion;

    let output = {
      appName: app.name,
      resourceId: app.id,
      location: app.location,
      state: app.properties?.state,
      defaultHostName: app.properties?.defaultHostName,
      kind: app.kind,
      enabled: app.properties?.enabled,
      httpsOnly: app.properties?.httpsOnly,
      clientAffinityEnabled: app.properties?.clientAffinityEnabled,
      operatingSystem: isLinux ? 'Linux' : 'Windows',
      runtimeStack: getFunctionAppRuntimeStack(config.properties),
      functionsVersion:
        getFunctionAppVersion(config.properties) ??
        getFunctionAppVersion(app.properties?.siteConfig),
      tags: app.tags,
      appSettings,
      siteConfig: config.properties
    };

    return {
      output,
      message: `Function app **${app.name}** is **${app.properties?.state || 'unknown'}** in **${app.location}**.\n- Host: \`${app.properties?.defaultHostName}\`\n- OS: ${isLinux ? 'Linux' : 'Windows'}${ctx.input.includeAppSettings ? `\n- App settings: ${Object.keys(appSettings || {}).length} configured` : ''}`
    };
  })
  .build();
