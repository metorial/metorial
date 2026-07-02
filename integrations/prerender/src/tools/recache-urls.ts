import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrerenderClient } from '../lib/client';
import { spec } from '../spec';

export let recacheUrls = SlateTool.create(spec, {
  name: 'Recache URLs',
  key: 'recache_urls',
  description: `Trigger caching or recaching of one or more URLs to ensure search engines see up-to-date content. Instead of waiting for cache expiration, use this to immediately refresh high-priority pages. Supports targeting desktop or mobile rendering.`,
  constraints: ['Maximum of 1,000 URLs per request.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      urls: z
        .array(z.string())
        .min(1)
        .describe('List of URLs to recache. Provide one or more full URLs.'),
      adaptiveType: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Target rendering type. Defaults to desktop if not specified.')
    })
  )
  .output(
    z.object({
      urlCount: z.number().describe('Number of URLs submitted for recaching.'),
      response: z
        .record(z.string(), z.unknown())
        .describe('Raw response from the Prerender API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrerenderClient({ token: ctx.auth.token });

    let urls = ctx.input.urls;
    let response = await client.recache({
      urls: urls,
      adaptiveType: ctx.input.adaptiveType
    });

    return {
      output: {
        urlCount: urls.length,
        response: response as Record<string, unknown>
      },
      message: `Submitted ${urls.length} URL(s) for recaching${ctx.input.adaptiveType ? ` (${ctx.input.adaptiveType})` : ''}.`
    };
  })
  .build();
