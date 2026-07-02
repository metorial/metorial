import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteScans = SlateTool.create(spec, {
  name: 'Delete Scans',
  key: 'delete_scans',
  description: `Delete scan records from CodeREADr. Permanently removes the specified scan records.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      scanIds: z.string().describe('Comma-separated scan IDs to delete')
    })
  )
  .output(
    z.object({
      scanIds: z.string().describe('IDs of the deleted scans')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteScans(ctx.input.scanIds);

    return {
      output: { scanIds: ctx.input.scanIds },
      message: `Deleted scan(s) **${ctx.input.scanIds}**.`
    };
  })
  .build();
