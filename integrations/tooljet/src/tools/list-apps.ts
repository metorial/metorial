import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let appVersionSchema = z.object({
  versionId: z.string().describe('ID of the app version'),
  versionName: z.string().describe('Name of the app version')
});

let appSchema = z.object({
  appId: z.string().describe('UUID of the application'),
  appName: z.string().describe('Name of the application'),
  slug: z.string().describe('URL slug of the application'),
  versions: z
    .array(appVersionSchema)
    .optional()
    .describe('Available versions of the application')
});

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `List all applications in a specific workspace, including their available versions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('UUID of the workspace to list apps from')
    })
  )
  .output(
    z.object({
      apps: z.array(appSchema).describe('List of applications in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let rawApps = await client.listApps(ctx.input.workspaceId);

    let apps = rawApps.map((a: any) => ({
      appId: a.id,
      appName: a.name,
      slug: a.slug,
      versions: a.versions?.map((v: any) => ({
        versionId: v.id,
        versionName: v.name
      }))
    }));

    return {
      output: { apps },
      message: `Found **${apps.length}** application(s) in workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();
