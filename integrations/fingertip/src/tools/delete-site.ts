import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let deleteSite = SlateTool.create(spec, {
  name: 'Delete Site',
  key: 'delete_site',
  description: `Permanently delete a Fingertip site and all its associated data including pages, blocks, contacts, and bookings.`,
  tags: {
    destructive: true
  },
  constraints: [
    'This action is irreversible. The site and all associated data will be permanently removed.'
  ]
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.deleteSite(ctx.input.siteId);

    return {
      output: { success: result.success },
      message: `Site deleted successfully.`
    };
  })
  .build();
