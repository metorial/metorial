import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getShareUrisTool = SlateTool.create(spec, {
  name: 'Get Album Share URIs',
  key: 'get_album_share_uris',
  description: `Retrieve sharing URIs for a SmugMug album. Returns URLs that can be used to share the gallery with others, including direct links and embed codes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      albumKey: z.string().describe('Album key to get share URIs for')
    })
  )
  .output(
    z.object({
      albumKey: z.string().describe('Album key'),
      shareUris: z
        .record(z.string(), z.string())
        .optional()
        .describe('Map of share URI types to URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let shareUris = await client.getAlbumShareUris(ctx.input.albumKey);

    let uriMap: Record<string, string> = {};
    if (shareUris) {
      for (let [key, value] of Object.entries(shareUris)) {
        if (typeof value === 'string') {
          uriMap[key] = value;
        } else if (value && typeof value === 'object' && 'Uri' in (value as any)) {
          uriMap[key] = (value as any).Uri;
        }
      }
    }

    return {
      output: {
        albumKey: ctx.input.albumKey,
        shareUris: uriMap
      },
      message: `Retrieved share URIs for album **${ctx.input.albumKey}**`
    };
  })
  .build();
