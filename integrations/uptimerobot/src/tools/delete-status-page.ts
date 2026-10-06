import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteStatusPage = SlateTool.create(spec, {
  name: 'Delete Status Page',
  key: 'delete_status_page',
  description: `Use a Legacy API Key connection (API v2). Permanently delete a public status page. The page URL will no longer be accessible.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      statusPageId: z.number().describe('ID of the status page to delete')
    })
  )
  .output(
    z.object({
      statusPageId: z.number().describe('ID of the deleted status page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.deletePSP(ctx.input.statusPageId);

    return {
      output: {
        statusPageId: result.id
      },
      message: `Deleted status page **${ctx.input.statusPageId}**.`
    };
  })
  .build();
