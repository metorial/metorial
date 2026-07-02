import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteApp = SlateTool.create(spec, {
  name: 'Delete App',
  key: 'delete_app',
  description: `Permanently delete a Retool application. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('The ID of the app to delete')
    })
  )
  .output(
    z.object({
      appId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    await client.deleteApp(ctx.input.appId);

    return {
      output: {
        appId: ctx.input.appId,
        deleted: true
      },
      message: `Deleted app \`${ctx.input.appId}\`.`
    };
  })
  .build();
