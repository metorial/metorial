import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractUrl = SlateTool.create(spec, {
  name: 'Extract URL',
  key: 'extract_url',
  description:
    'Extract structured JSON from a page on a prepared domain. Call list_extract_domains to discover supported domains. Returns the provider response, including parsed data and HTML when available.',
  instructions: [
    'Use auto or native for website-specific fields. standard currently supports real estate pages only.',
    'Omit fields on the first request to discover available parsed field names. Then select comma-separated fields or dot paths such as products.name,products.price.'
  ],
  constraints: [
    'The target domain must be prepared for extraction; unprepared domains return a provider error.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      url: z
        .string()
        .describe(
          'Absolute HTTP or HTTPS page URL on a domain returned by list_extract_domains'
        ),
      extract: z
        .enum(['auto', 'native', 'standard'])
        .optional()
        .describe(
          'Extraction mode. Defaults to auto. standard currently supports real estate only.'
        ),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated parsed field names or dot paths. Omit to return every available field.'
        ),
      jsRender: z
        .boolean()
        .optional()
        .describe('Enable JavaScript rendering for dynamic pages'),
      premiumProxy: z
        .boolean()
        .optional()
        .describe('Use residential proxies for protected pages')
    })
  )
  .output(
    z.object({
      results: z
        .record(z.string(), z.unknown())
        .describe(
          'Provider extraction response, including structured parsed data when available'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results = await client.extractUrl(ctx.input);
    return {
      output: { results },
      message: `Extracted structured data from **${ctx.input.url}**.`
    };
  })
  .build();
