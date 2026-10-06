import { SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { spec } from '../spec';

export let shortenLinkTool = SlateTool.create(spec, {
  name: 'Shorten Link',
  key: 'shorten_link',
  description: `Shorten a URL using Hootsuite's Ow.ly link shortener.
Returns a shortened Ow.ly URL for use in social media posts.`,
  constraints: [
    'The legacy Ow.ly API route is retained, but current public API availability is undocumented. The dashboard shortener remains available. Created short links can retain history and have no documented API deletion.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to shorten')
    })
  )
  .output(
    z.object({
      shortenedUrl: z.string().describe('The shortened Ow.ly URL'),
      originalUrl: z.string().describe('The original URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);

    let result = await client.shortenLink(ctx.input.url);

    return {
      output: {
        shortenedUrl: result.shortenedUrl,
        originalUrl: ctx.input.url
      },
      message: `Shortened **${ctx.input.url}** → **${result.shortenedUrl}**.`
    };
  })
  .build();
