import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getApp = SlateTool.create(spec, {
  name: 'Get App',
  key: 'get_app',
  description:
    'Read exact Retool app metadata. Call list_apps to discover app IDs. This does not export or edit an app definition.',
  tags: { readOnly: true }
})
  .input(z.object({ appId: z.string().describe('Native app UUID from list_apps.') }))
  .output(
    z.object({
      appId: z.string(),
      appName: z.string(),
      folderId: z.string().nullable().optional(),
      isMobileApp: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let app = (await clientFor(ctx).getApp(ctx.input.appId)).data;
    return {
      output: {
        appId: app.id,
        appName: app.name,
        folderId: app.folder_id,
        isMobileApp: app.is_mobile_app,
        createdAt: app.created_at,
        updatedAt: app.updated_at
      },
      message: 'Retrieved the requested app metadata.'
    };
  })
  .build();
