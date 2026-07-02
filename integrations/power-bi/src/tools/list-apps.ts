import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let appSchema = z.object({
  appId: z.string().describe('Unique identifier of the app'),
  name: z.string().describe('Display name of the app'),
  description: z.string().optional().describe('App description'),
  publishedBy: z.string().optional().describe('Who published the app'),
  lastUpdate: z.string().optional().describe('Last update timestamp')
});

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `List published Power BI apps accessible to the authenticated user. Apps are read-only collections of dashboards and reports shared with an audience.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      apps: z.array(appSchema).describe('List of published apps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let apps = await client.listApps();

    let mapped = apps.map((a: any) => ({
      appId: a.id,
      name: a.name,
      description: a.description,
      publishedBy: a.publishedBy,
      lastUpdate: a.lastUpdate
    }));

    return {
      output: { apps: mapped },
      message: `Found **${mapped.length}** app(s).`
    };
  })
  .build();
