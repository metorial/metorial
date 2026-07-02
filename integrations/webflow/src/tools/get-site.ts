import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let getSite = SlateTool.create(spec, {
  name: 'Get Site',
  key: 'get_site',
  description: `Retrieve detailed information about a specific Webflow site, including metadata, custom domains, locale settings, and publish status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('Unique identifier for the site'),
      displayName: z.string().describe('Display name of the site'),
      shortName: z.string().describe('URL-friendly slug of the site'),
      workspaceId: z.string().describe('Workspace the site belongs to'),
      previewUrl: z.string().optional().describe('Preview image URL'),
      timeZone: z.string().optional().describe('Timezone configured for the site'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      lastPublished: z.string().optional().describe('ISO 8601 timestamp of last publish'),
      lastUpdated: z.string().optional().describe('ISO 8601 timestamp of last update'),
      customDomains: z
        .array(
          z.object({
            domainId: z.string().optional(),
            url: z.string().optional(),
            lastPublished: z.string().optional()
          })
        )
        .optional()
        .describe('Custom domains configured for the site'),
      locales: z.any().optional().describe('Locale configuration for the site')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let s = await client.getSite(ctx.input.siteId);

    return {
      output: {
        siteId: s.id,
        displayName: s.displayName ?? s.name ?? '',
        shortName: s.shortName ?? '',
        workspaceId: s.workspaceId ?? '',
        previewUrl: s.previewUrl,
        timeZone: s.timeZone,
        createdOn: s.createdOn,
        lastPublished: s.lastPublished,
        lastUpdated: s.lastUpdated,
        customDomains: (s.customDomains ?? []).map((d: any) => ({
          domainId: d.id,
          url: d.url,
          lastPublished: d.lastPublished
        })),
        locales: s.locales
      },
      message: `Retrieved site **${s.displayName ?? s.name}** (${s.id}).`
    };
  })
  .build();
