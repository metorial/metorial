import { SlateTool } from 'slates';
import { z } from 'zod';
import { FluxguardClient } from '../lib/client';
import { spec } from '../spec';

export let deleteSite = SlateTool.create(spec, {
  name: 'Delete Site',
  key: 'delete_site',
  description: `Delete a monitored site along with all its sessions, pages, and captured versions. This is a destructive operation that permanently removes everything associated with the site.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to delete')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('ID of the deleted site'),
      deleted: z.boolean().describe('Whether the site was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    await client.deleteSite(ctx.input.siteId);

    return {
      output: {
        siteId: ctx.input.siteId,
        deleted: true
      },
      message: `Deleted site \`${ctx.input.siteId}\` and all its sessions, pages, and captured versions.`
    };
  })
  .build();
