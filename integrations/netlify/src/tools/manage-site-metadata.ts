import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { netlifyServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSiteMetadata = SlateTool.create(spec, {
  name: 'Manage Site Metadata',
  key: 'manage_site_metadata',
  description: `Get or replace custom metadata for a Netlify site. Metadata is an arbitrary JSON object stored with the site.`
})
  .input(
    z.object({
      action: z.enum(['get', 'update']).describe('Action to perform'),
      siteId: z.string().describe('The site ID'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Metadata object to replace existing site metadata with')
    })
  )
  .output(
    z.object({
      metadata: z.record(z.string(), z.unknown()).describe('Current site metadata'),
      updated: z.boolean().optional().describe('Whether metadata was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'update') {
      if (!ctx.input.metadata) {
        throw netlifyServiceError('metadata is required for update action');
      }

      await client.updateSiteMetadata(ctx.input.siteId, ctx.input.metadata);
      let metadata = await client.getSiteMetadata(ctx.input.siteId);

      return {
        output: { metadata: metadata || {}, updated: true },
        message: `Updated metadata for site **${ctx.input.siteId}**.`
      };
    }

    let metadata = await client.getSiteMetadata(ctx.input.siteId);

    return {
      output: { metadata: metadata || {} },
      message: `Retrieved metadata for site **${ctx.input.siteId}**.`
    };
  })
  .build();
