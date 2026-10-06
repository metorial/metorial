import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let deleteApp = SlateTool.create(spec, {
  name: 'Delete App',
  key: 'delete_app',
  description: `Request deletion of an exact Retool application. A successful native receipt does not prove permanent erasure of history, trash, or caches.`,
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
    let client = clientFor(ctx);

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
