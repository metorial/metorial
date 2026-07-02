import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLinks = SlateTool.create(spec, {
  name: 'Delete Links',
  key: 'delete_links',
  description: `Permanently deletes one or more shortened links by their IDs. Deleted links stop working immediately and cannot be recovered.`,
  constraints: [
    'This action is irreversible — deleted links cannot be restored.',
    'Links stop redirecting immediately after deletion.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      linkIds: z.array(z.number()).min(1).describe('Array of link IDs to delete')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of links deleted'),
      deletedLinkIds: z.array(z.number()).describe('IDs of deleted links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    if (ctx.input.linkIds.length === 1) {
      await client.deleteLink(ctx.input.linkIds[0]!);
    } else {
      await client.deleteLinks(ctx.input.linkIds);
    }

    return {
      output: {
        deletedCount: ctx.input.linkIds.length,
        deletedLinkIds: ctx.input.linkIds
      },
      message: `Deleted **${ctx.input.linkIds.length}** link(s): ${ctx.input.linkIds.join(', ')}`
    };
  })
  .build();
