import { SlateTool } from 'slates';
import { Client } from '../lib/client';
import { appSchema, workspaceId } from '../lib/schemas';
import { z } from '../lib/validation';
import { spec } from '../spec';
export const listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description:
    'List application IDs and versions in a workspace discovered with list_workspaces. Native unpaginated collections over the local 1,000-item bound are refused.',
  tags: { readOnly: true }
})
  .input(z.object({ workspaceId }))
  .output(z.object({ apps: z.array(appSchema) }))
  .handleInvocation(async ctx => {
    const apps = (await new Client(ctx.auth, ctx.config).listApps(ctx.input.workspaceId)).map(
      a => ({
        appId: a.id,
        appName: a.name,
        slug: a.slug,
        versions: a.versions?.map(v => ({ versionId: v.id, versionName: v.name }))
      })
    );
    return { output: { apps }, message: `Returned ${apps.length} native applications.` };
  })
  .build();
