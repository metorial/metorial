import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMonitor = SlateTool.create(spec, {
  name: 'Delete Monitor',
  key: 'delete_monitor',
  description: `Permanently deletes a web page monitor (wachet) by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      wachetId: z.string().describe('ID of the monitor to delete')
    })
  )
  .output(
    z.object({
      wachetId: z.string().describe('ID of the deleted monitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteWachet(ctx.input.wachetId);

    return {
      output: {
        wachetId: ctx.input.wachetId
      },
      message: `Deleted monitor \`${ctx.input.wachetId}\`.`
    };
  })
  .build();
