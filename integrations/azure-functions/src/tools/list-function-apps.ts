import { SlateTool } from 'slates';
import { z } from 'zod';
import { ArmClient } from '../lib/client';
import { getFunctionAppVersion } from '../lib/function-app-metadata';
import { spec } from '../spec';

let LIST_APPS_CONFIG_CONCURRENCY = 5;

let functionAppSummarySchema = z.object({
  appName: z.string().describe('Name of the function app'),
  resourceId: z.string().describe('Full ARM resource ID'),
  location: z.string().describe('Azure region where the app is hosted'),
  state: z.string().optional().describe('Current state of the app (e.g. Running, Stopped)'),
  defaultHostName: z.string().optional().describe('Default hostname for the function app'),
  kind: z.string().optional().describe('Resource kind (e.g. functionapp, functionapp,linux)'),
  runtimeVersion: z.string().optional().describe('Functions runtime version'),
  tags: z.record(z.string(), z.string()).optional().describe('Resource tags')
});

// Limits config lookups to N in-flight at a time so we don't hit ARM rate limits
// on subscriptions with many function apps. Preserves input order in the output.
let mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  let results = new Array<R>(items.length);
  let cursor = 0;

  let workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      let index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!, index);
    }
  });

  await Promise.all(workers);
  return results;
};

export let listFunctionApps = SlateTool.create(spec, {
  name: 'List Function Apps',
  key: 'list_function_apps',
  description: `List all Azure Function Apps in the configured resource group. Returns a summary of each function app including its name, location, state, and hostname. Useful for discovering available function apps before performing further operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      functionApps: z.array(functionAppSummarySchema).describe('List of function apps'),
      count: z.number().describe('Total number of function apps found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ArmClient({
      token: ctx.auth.token,
      subscriptionId: ctx.config.subscriptionId,
      resourceGroupName: ctx.config.resourceGroupName
    });

    ctx.info(`Listing function apps in resource group: ${ctx.config.resourceGroupName}`);

    let apps = await client.listFunctionApps();
    let functionApps = await mapWithConcurrency(
      apps,
      LIST_APPS_CONFIG_CONCURRENCY,
      async (app: any) => {
        let config = await client.getConfiguration(app.name).catch(() => undefined);

        return {
          appName: app.name,
          resourceId: app.id,
          location: app.location,
          state: app.properties?.state,
          defaultHostName: app.properties?.defaultHostName,
          kind: app.kind,
          runtimeVersion:
            getFunctionAppVersion(config?.properties) ??
            getFunctionAppVersion(app.properties?.siteConfig),
          tags: app.tags
        };
      }
    );

    return {
      output: {
        functionApps,
        count: functionApps.length
      },
      message: `Found **${functionApps.length}** function app(s) in resource group **${ctx.config.resourceGroupName}**.${functionApps.length > 0 ? `\n\nApps: ${functionApps.map((a: any) => `\`${a.appName}\` (${a.state || 'unknown'})`).join(', ')}` : ''}`
    };
  })
  .build();
