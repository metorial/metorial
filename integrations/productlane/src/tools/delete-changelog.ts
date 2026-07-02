import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteChangelog = SlateTool.create(spec, {
  name: 'Delete Changelog',
  key: 'delete_changelog',
  description: `Permanently delete a changelog entry.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      changelogId: z.string().describe('ID of the changelog to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteChangelog(ctx.input.changelogId);

    return {
      output: { success: true },
      message: `Deleted changelog ${ctx.input.changelogId}.`
    };
  })
  .build();
