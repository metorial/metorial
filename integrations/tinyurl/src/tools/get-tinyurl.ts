import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTinyUrl = SlateTool.create(spec, {
  name: 'Get TinyURL',
  key: 'get_tinyurl',
  description: `Retrieve details about an existing TinyURL including its destination URL, hit count, tags, expiration, and analytics settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .default('tinyurl.com')
        .describe('Domain of the TinyURL (defaults to tinyurl.com)'),
      alias: z.string().describe('Alias of the TinyURL to retrieve')
    })
  )
  .output(
    z.object({
      tinyUrl: z.string().describe('The shortened URL'),
      domain: z.string().describe('Domain of the shortened URL'),
      alias: z.string().describe('Alias portion of the shortened URL'),
      url: z.string().describe('The original destination URL'),
      hits: z.number().describe('Total number of clicks'),
      archived: z.boolean().describe('Whether the link is archived'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      expiresAt: z.string().nullable().describe('ISO 8601 expiration timestamp or null'),
      tags: z.array(z.string()).describe('Tags assigned to the link'),
      description: z.string().nullable().describe('Description of the link'),
      analyticsEnabled: z.boolean().describe('Whether analytics collection is enabled'),
      analyticsPublic: z.boolean().describe('Whether analytics are publicly shared')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTinyUrl(ctx.input.domain, ctx.input.alias);

    return {
      output: {
        tinyUrl: result.tiny_url,
        domain: result.domain,
        alias: result.alias,
        url: result.url,
        hits: result.hits,
        archived: result.archived,
        createdAt: result.created_at,
        expiresAt: result.expires_at,
        tags: result.tags || [],
        description: result.description,
        analyticsEnabled: result.analytics?.enabled ?? false,
        analyticsPublic: result.analytics?.public ?? false
      },
      message: `Retrieved TinyURL **${result.tiny_url}** → ${result.url} (${result.hits} hits)`
    };
  })
  .build();
