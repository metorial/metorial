import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let destinationSchema = z.object({
  url: z.string().describe('The destination URL to redirect to. Maximum 8192 characters.'),
  country: z
    .string()
    .optional()
    .describe(
      'Two-letter country code (e.g., "US", "GB") for geo-targeting. If omitted, this destination applies to all countries.'
    ),
  os: z
    .string()
    .optional()
    .describe(
      'Operating system for OS-targeting (e.g., "iOS", "Android", "Windows", "macOS", "Linux"). OS destinations take priority over country destinations.'
    )
});

let metatagSchema = z.object({
  name: z.string().describe('Meta tag name (e.g., "og:title", "og:description", "og:image").'),
  content: z.string().describe('Meta tag content value.')
});

let snippetSchema = z.object({
  snippetId: z
    .string()
    .describe(
      'Snippet identifier for the tracking pixel provider (e.g., Facebook, Google Analytics, Pinterest, Taboola).'
    ),
  parameters: z
    .record(z.string(), z.string())
    .optional()
    .describe('Key-value parameters specific to the pixel provider.')
});

export let createAlias = SlateTool.create(spec, {
  name: 'Create Short URL',
  key: 'create_alias',
  description: `Creates a new shortened URL (alias) that redirects to one or more destination URLs. Supports vanity aliases, geo/OS-based redirect targeting, custom meta tags for social sharing, and tracking pixel snippets. Use the \`@rnd\` macro in the alias name to combine custom text with random characters (e.g., "promo/@rnd").`,
  instructions: [
    'At least one destination with a URL is required. The first destination without country/OS targeting serves as the default.',
    'If aliasName is omitted, a random 7-character alias is generated automatically.',
    'Use the @rnd macro in aliasName to mix custom text with random characters (e.g., "sale/@rnd").'
  ],
  constraints: [
    'Alias must be at least 1 character if specified.',
    'Destination URLs have a maximum length of 8192 characters.',
    'Each alias is unique within its domain. If an alias is taken on a shared domain like short.fyi, use a custom domain.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      aliasName: z
        .string()
        .optional()
        .describe(
          'Custom alias path for the short URL (e.g., "my-link"). If omitted, a random 7-character string is generated. Supports the @rnd macro for partial randomization.'
        ),
      domainName: z
        .string()
        .optional()
        .describe(
          'Domain to create the alias on (e.g., "your.domain.com"). Defaults to "short.fyi" if omitted.'
        ),
      destinations: z
        .array(destinationSchema)
        .min(1)
        .describe(
          'One or more destination URLs. Include a default destination (no country/OS) and optional geo/OS-targeted destinations.'
        ),
      metatags: z
        .array(metatagSchema)
        .optional()
        .describe(
          'Custom meta tags for controlling how the short URL appears when shared on social media.'
        ),
      snippets: z
        .array(snippetSchema)
        .optional()
        .describe('Tracking pixel snippets to fire when the short URL is clicked.')
    })
  )
  .output(
    z.object({
      aliasName: z.string().describe('The created alias path.'),
      domainName: z.string().describe('The domain the alias was created on.'),
      shortUrl: z.string().describe('The full shortened URL ready to share.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createAlias({
      aliasName: ctx.input.aliasName,
      domainName: ctx.input.domainName,
      destinations: ctx.input.destinations,
      metatags: ctx.input.metatags,
      snippets: ctx.input.snippets?.map(s => ({
        id: s.snippetId,
        parameters: s.parameters
      }))
    });

    return {
      output: {
        aliasName: result.aliasName,
        domainName: result.domainName,
        shortUrl: result.shortUrl
      },
      message: `Created short URL: **${result.shortUrl}** (alias: \`${result.aliasName}\` on domain \`${result.domainName}\`)`
    };
  })
  .build();
