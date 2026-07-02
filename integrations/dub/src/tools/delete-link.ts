import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLink = SlateTool.create(spec, {
  name: 'Delete Link',
  key: 'delete_link',
  description: `Permanently delete a short link. Use the Dub link ID or an external ID prefixed with \`ext_\`.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      linkId: z.string().describe('The Dub link ID or external ID prefixed with ext_')
    })
  )
  .output(
    z.object({
      deletedLinkId: z.string().describe('ID of the deleted link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteLink(ctx.input.linkId);

    return {
      output: {
        deletedLinkId: result.id
      },
      message: `Deleted link \`${result.id}\``
    };
  })
  .build();
