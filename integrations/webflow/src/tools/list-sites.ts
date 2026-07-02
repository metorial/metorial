import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let siteSchema = z.object({
  siteId: z.string().describe('Unique identifier for the site'),
  displayName: z.string().describe('Display name of the site'),
  shortName: z.string().describe('URL-friendly slug of the site'),
  workspaceId: z.string().describe('Workspace the site belongs to'),
  previewUrl: z.string().optional().describe('Preview image URL for the site'),
  timeZone: z.string().optional().describe('Timezone configured for the site'),
  createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
  lastPublished: z.string().optional().describe('ISO 8601 timestamp of last publish'),
  lastUpdated: z.string().optional().describe('ISO 8601 timestamp of last update'),
  customDomains: z
    .array(
      z.object({
        domainId: z.string().optional(),
        url: z.string().optional()
      })
    )
    .optional()
    .describe('Custom domains configured for the site')
});

export let listSites = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description: `List all Webflow sites accessible with the current authentication. Returns site metadata including names, domains, publish status, and workspace association.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sites: z.array(siteSchema).describe('List of Webflow sites')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let data = await client.listSites();
    let sites = (data.sites ?? []).map((s: any) => ({
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
        url: d.url
      }))
    }));

    return {
      output: { sites },
      message: `Found **${sites.length}** site(s).`
    };
  })
  .build();
