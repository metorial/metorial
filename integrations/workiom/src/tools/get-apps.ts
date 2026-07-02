import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `Retrieves all apps in your Workiom workspace. Apps are top-level containers that hold lists (tables) and their associated data. Use this to discover available apps and their IDs before working with lists or records.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      apps: z.array(z.any()).describe('Array of app objects in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let apps = await client.getApps();

    let appList = Array.isArray(apps) ? apps : (apps?.items ?? []);

    return {
      output: {
        apps: appList
      },
      message: `Found **${appList.length}** app(s) in the workspace.`
    };
  })
  .build();
