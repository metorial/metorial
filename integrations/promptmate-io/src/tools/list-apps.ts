import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `List all apps available in your Promptmate.io account. Returns each app's ID, name, and estimated credit cost per row. Use this to discover which apps are available before running jobs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      apps: z
        .array(
          z.object({
            appId: z.string().describe('Unique identifier for the app'),
            appName: z.string().describe('Name of the app'),
            creditEstimate: z.number().optional().describe('Estimated credit usage per row')
          })
        )
        .describe('List of available apps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let apps = await client.listApps();

    return {
      output: { apps },
      message: `Found **${apps.length}** app(s).`
    };
  })
  .build();
