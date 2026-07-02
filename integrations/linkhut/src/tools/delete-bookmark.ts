import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteBookmark = SlateTool.create(spec, {
  name: 'Delete Bookmark',
  key: 'delete_bookmark',
  description: `Remove a bookmark from Linkhut by its URL. The bookmark and all its associated data will be permanently deleted.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the bookmark to delete')
    })
  )
  .output(
    z.object({
      resultCode: z
        .string()
        .describe('Result code from the API (e.g. "done" or "item not found")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteBookmark(ctx.input.url);

    return {
      output: result,
      message: `Bookmark for **${ctx.input.url}** deleted. Result: ${result.resultCode}`
    };
  })
  .build();
