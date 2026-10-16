import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { linkFields } from '../lib/schemas';
import { spec } from '../spec';

export let createLink = SlateTool.create(spec, {
  name: 'Create Link',
  key: 'create_link',
  description: `Creates a new shortened link with optional configuration for custom domains, slugs, UTM parameters, Open Graph metadata, redirect rules, retargeting pixels, expiry settings, and password protection.`,
  instructions: [
    'The url field is the only required field — all others are optional.',
    'To set up smart redirects (geo, device, rotator), use the rules array.',
    'For geo-redirects, use ISO 3166 alpha-2 country codes in the matches field.',
    'For device redirects, use platform names: ios, android, windows, linux, mac.',
    'For rotator rules, set what to "rotator" and specify percentage for traffic splitting.'
  ],
  constraints: [
    'Rate limited to 20 requests/second.',
    'Custom slugs must be unique within the domain.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(z.object(linkFields))
  .output(
    z.object({
      linkId: z.number().describe('Unique ID of the created link'),
      url: z.string().describe('Destination URL'),
      fullUrl: z.string().describe('Full short URL'),
      name: z.string().optional().nullable().describe('Link nickname'),
      domain: z.string().optional().nullable().describe('Custom domain used'),
      slug: z.string().optional().nullable().describe('URL slug'),
      enabled: z.boolean().optional().describe('Whether the link is active')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.createOrUpdateLink(ctx.input);

    return {
      output: {
        linkId: result.id,
        url: result.url,
        fullUrl: result.full_url,
        name: result.name,
        domain: result.domain,
        slug: result.slug,
        enabled: result.enabled
      },
      message: `Created short link **${result.full_url}** → ${result.url}`
    };
  })
  .build();
