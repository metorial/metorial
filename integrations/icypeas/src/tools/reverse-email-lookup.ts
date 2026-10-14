import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reverseEmailLookup = SlateTool.create(spec, {
  name: 'Reverse Email Lookup',
  key: 'reverse_email_lookup',
  description:
    'Find the professional profile URL associated with an email address. Use Scrape Profile to retrieve details for a found profile.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      email: z.string().trim().email().describe('Professional email address to look up')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the lookup was accepted'),
      profileUrl: z.string().optional().describe('Professional profile URL when found'),
      searchId: z.string().optional().describe('Lookup identifier'),
      status: z.string().optional().describe('Lookup status'),
      raw: z.any().optional().describe('Full provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.reverseEmailLookup(ctx.input.email);
    let profileUrl =
      typeof result.results === 'string'
        ? result.results || undefined
        : typeof result.result === 'string'
          ? result.result || undefined
          : undefined;
    return {
      output: {
        success: result.success ?? true,
        profileUrl,
        searchId: result.searchId,
        status: result.status,
        raw: result
      },
      message: profileUrl
        ? `Found profile URL: **${profileUrl}**.`
        : 'No profile URL found for this email address.'
    };
  })
  .build();
