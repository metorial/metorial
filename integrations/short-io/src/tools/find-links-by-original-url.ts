import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findLinksByOriginalUrl = SlateTool.create(spec, {
  name: 'Find Links by Destination',
  key: 'find_links_by_original_url',
  description:
    'Find all short links on a domain that point to the same destination URL. Uses the current multi-result lookup endpoint. Call list_domains to discover hostnames.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe('Domain hostname from list_domains. Falls back to the configured default.'),
      originalURL: z.string().describe('Exact destination URL to search for.')
    })
  )
  .output(
    z.object({
      links: z.unknown().describe('Complete matching-links result returned by Short.io.')
    })
  )
  .handleInvocation(async ctx => {
    let domain = ctx.input.domain || ctx.config.domain;
    if (!domain)
      throw createApiServiceError(
        'Provide a domain hostname from list_domains or configure a default domain.'
      );
    let links = await new Client(ctx.auth).findLinksByOriginalUrl(
      domain,
      ctx.input.originalURL
    );
    return {
      output: { links },
      message: `Retrieved links pointing to **${ctx.input.originalURL}**.`
    };
  })
  .build();
