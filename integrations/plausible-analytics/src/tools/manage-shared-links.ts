import { SlateTool } from 'slates';
import { z } from 'zod';
import { SitesClient } from '../lib/client';
import { spec } from '../spec';

export let createSharedLink = SlateTool.create(spec, {
  name: 'Create Shared Link',
  key: 'create_shared_link',
  description: `Create or find a shared link for a site to enable public or embedded dashboard access. This endpoint is idempotent — requesting an existing link name returns the existing link. Requires a Sites API key (Enterprise plan).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site'),
      name: z.string().describe('Name for the shared link (used as identifier)')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Name of the shared link'),
      url: z.string().describe('URL for the shared dashboard link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createSharedLink(ctx.input.siteId, ctx.input.name);

    return {
      output: {
        name: result.name,
        url: result.url
      },
      message: `Shared link **${result.name}** created/found for site **${ctx.input.siteId}**: ${result.url}`
    };
  })
  .build();
