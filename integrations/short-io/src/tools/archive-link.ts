import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let archiveLink = SlateTool.create(spec, {
  name: 'Archive or Unarchive Link',
  key: 'archive_link',
  description: `Archive or unarchive a short link. Archived links stop redirecting but are not deleted. Use this to temporarily disable a link without losing its data.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      linkId: z.string().describe('The ID of the link to archive or unarchive.'),
      archive: z.boolean().describe('Set to true to archive, false to unarchive.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful.'),
      linkId: z.string().describe('The link ID.'),
      archived: z.boolean().describe('The new archive status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = ctx.input.archive
      ? await client.archiveLink(ctx.input.linkId)
      : await client.unarchiveLink(ctx.input.linkId);

    return {
      output: {
        success: result.success,
        linkId: ctx.input.linkId,
        archived: ctx.input.archive
      },
      message: ctx.input.archive
        ? `Archived link **${ctx.input.linkId}**`
        : `Unarchived link **${ctx.input.linkId}**`
    };
  })
  .build();
