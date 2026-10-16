import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { rawSchema } from '../lib/types';
import { spec } from '../spec';

export let deleteStatusPage = SlateTool.create(spec, {
  name: 'Delete Status Page',
  key: 'delete_status_page',
  description: `Permanently delete a status page. The underlying monitoring checks are not affected.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      statusPageToken: z
        .string()
        .describe('The unique token identifier of the status page to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the status page was successfully deleted'),
      raw: rawSchema.optional().describe('Complete original deletion response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteStatusPage(ctx.input.statusPageToken);

    return {
      output: result,
      message: result.deleted
        ? `Deleted status page \`${ctx.input.statusPageToken}\`.`
        : 'Updown.io did not confirm status page deletion.'
    };
  })
  .build();
