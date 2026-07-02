import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

export let shortenLink = SlateTool.create(spec, {
  name: 'Shorten Link',
  key: 'shorten_link',
  description: `Creates a shortened URL with an optional call-to-action (CTA) ad overlay. The CTA is displayed when users visit the shortened link.
Use this to create trackable short links for social media posts with optional promotional overlays.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to shorten'),
      ctaId: z
        .number()
        .int()
        .describe(
          'CTA identifier to attach to the shortened link. Use the "List Link CTAs" tool to get available CTA IDs.'
        )
    })
  )
  .output(
    z.object({
      shortenedUrl: z.string().describe('The shortened URL'),
      originalUrl: z.string().describe('The original URL that was shortened'),
      service: z.string().describe('The shortening service used'),
      ctaId: z.number().describe('The CTA ID attached to this link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let result = await client.shortenLink(ctx.input.url, ctx.input.ctaId);

    return {
      output: {
        shortenedUrl: result.url,
        originalUrl: result.original,
        service: result.service,
        ctaId: result.ctaId
      },
      message: `Shortened link: **${result.url}** (from ${result.original})`
    };
  })
  .build();
