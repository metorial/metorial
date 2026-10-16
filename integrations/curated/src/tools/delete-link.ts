import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { publicationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteLink = SlateTool.create(spec, {
  name: 'Delete Link',
  key: 'delete_link',
  description: `Delete a collected link from a publication. Removes the link from the collected items permanently. Call list_publications to discover the publication ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      publicationId: publicationIdSchema,
      linkId: z.string().describe('ID of the link to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the link was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteLink(ctx.input.publicationId, ctx.input.linkId);

    return {
      output: { deleted: true },
      message: `Deleted link with ID **${ctx.input.linkId}**.`
    };
  })
  .build();
