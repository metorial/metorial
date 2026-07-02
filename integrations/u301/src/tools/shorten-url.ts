import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let shortenUrl = SlateTool.create(spec, {
  name: 'Shorten URL',
  key: 'shorten_url',
  description: `Create a shortened URL from a long link. Optionally specify a custom domain, custom slug (alias), and a descriptive title. If the same long URL has already been shortened within the account, the previously created short link is returned.`,
  instructions: [
    'The URL must include http:// or https:// protocol prefix.',
    'Custom slugs must be unique and can only contain letters, numbers, underscores, and hyphens.',
    'Custom domains must be added and verified in the U301 dashboard before use.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe('The long URL to shorten (must start with http:// or https://)'),
      domain: z
        .string()
        .optional()
        .describe('Custom domain for the short link (e.g., go.example.com)'),
      slug: z
        .string()
        .optional()
        .describe(
          'Custom alias for the short link (letters, numbers, underscores, hyphens only; must be unique)'
        ),
      title: z.string().optional().describe('A descriptive title for the link')
    })
  )
  .output(
    z.object({
      code: z.string().describe('The short code identifier for the link'),
      originalUrl: z.string().describe('The original long URL that was shortened'),
      shortenedUrl: z.string().describe('The complete shortened URL'),
      status: z.string().describe('Link status: public, under_review, or blocked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Shortening URL...');

    let result = await client.shortenUrl({
      url: ctx.input.url,
      domain: ctx.input.domain,
      slug: ctx.input.slug,
      title: ctx.input.title
    });

    return {
      output: {
        code: result.code,
        originalUrl: result.url,
        shortenedUrl: result.shortened,
        status: result.status
      },
      message: `Shortened URL created: **${result.shortened}** (status: ${result.status})`
    };
  })
  .build();
