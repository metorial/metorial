import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateApp = SlateTool.create(spec, {
  name: 'Update App',
  key: 'update_app',
  description: `Update a Retool application's name or move it to a different folder. Only provide the fields you want to change.`
})
  .input(
    z.object({
      appId: z.string().describe('The ID of the app to update'),
      appName: z.string().optional().describe('New name for the application'),
      folderId: z
        .string()
        .nullable()
        .optional()
        .describe('New folder ID (set to null to move to root)')
    })
  )
  .output(
    z.object({
      appId: z.string(),
      appName: z.string(),
      folderId: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.updateApp(ctx.input.appId, {
      name: ctx.input.appName,
      folderId: ctx.input.folderId
    });

    let a = result.data;

    return {
      output: {
        appId: a.id,
        appName: a.name,
        folderId: a.folder_id
      },
      message: `Updated app **${a.name}** (ID: \`${a.id}\`).`
    };
  })
  .build();
