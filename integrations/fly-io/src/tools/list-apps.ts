import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `List all Fly Apps in an organization. Returns app names, machine counts, volume counts, and network configuration for each app.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgSlug: z.string().describe('Organization slug to list apps for')
    })
  )
  .output(
    z.object({
      totalApps: z.number().describe('Total number of apps in the organization'),
      apps: z
        .array(
          z.object({
            appId: z.string().describe('Unique app identifier'),
            appName: z.string().describe('Name of the app'),
            machineCount: z.number().describe('Number of machines in the app'),
            volumeCount: z.number().describe('Number of volumes in the app'),
            network: z.string().describe('Network the app belongs to')
          })
        )
        .describe('List of apps')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listApps(ctx.input.orgSlug);

    return {
      output: result,
      message: `Found **${result.totalApps}** app(s) in organization **${ctx.input.orgSlug}**.`
    };
  })
  .build();
