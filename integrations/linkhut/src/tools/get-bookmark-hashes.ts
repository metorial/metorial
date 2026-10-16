import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBookmarkHashes = SlateTool.create(spec, {
  name: 'Get Bookmark Hashes',
  key: 'get_bookmark_hashes',
  description:
    'Get the URL hashes and change signatures of all bookmarks for efficient synchronization. Compare signatures to find changes, then use Get Bookmarks with the URL hashes to retrieve matching bookmarks.',
  constraints: ['Check for updates before fetching a full manifest; use sparingly.'],
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      hashes: z.array(
        z.object({
          url: z
            .string()
            .describe(
              'MD5 hash of the bookmark URL; pass to the hashes input of Get Bookmarks'
            ),
          meta: z.string().describe('Change signature of the bookmark')
        })
      ),
      raw: z.unknown().describe('Original provider response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getBookmarkHashes();
    return {
      output: result,
      message: `Retrieved change signatures for **${result.hashes.length}** bookmark(s).`
    };
  })
  .build();
