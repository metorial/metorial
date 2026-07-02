import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';
import { oneOfRequiredError } from './errors';

export let getSite = SlateTool.create(spec, {
  name: 'Get Site',
  key: 'get_site',
  description: `Retrieve detailed information about a SharePoint site. Look up a site by its ID, hostname and path, or get the root site. Also supports listing subsites of a given site.`,
  instructions: [
    'Provide **siteId** to look up a specific site by ID.',
    'Provide **hostname** (e.g. "contoso.sharepoint.com") and optionally **sitePath** (e.g. "sites/marketing") to look up by URL.',
    'Set **getRootSite** to true to get the tenant root site.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      siteId: z.string().optional().describe('SharePoint site ID'),
      hostname: z
        .string()
        .optional()
        .describe('SharePoint site hostname, e.g. "contoso.sharepoint.com"'),
      sitePath: z
        .string()
        .optional()
        .describe('Relative path on the hostname, e.g. "sites/marketing"'),
      getRootSite: z
        .boolean()
        .optional()
        .describe('If true, returns the root site of the tenant')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('Unique site ID'),
      siteName: z.string().describe('Display name of the site'),
      siteDescription: z.string().nullable().describe('Site description'),
      webUrl: z.string().describe('Full URL of the site'),
      createdDateTime: z.string().optional().describe('When the site was created'),
      lastModifiedDateTime: z.string().optional().describe('When the site was last modified'),
      hostname: z.string().optional().describe('Hostname of the site')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);
    let site: any;

    if (ctx.input.getRootSite) {
      site = await client.getRootSite();
    } else if (ctx.input.hostname) {
      site = await client.getSiteByHostnameAndPath(ctx.input.hostname, ctx.input.sitePath);
    } else if (ctx.input.siteId) {
      site = await client.getSite(ctx.input.siteId);
    } else {
      throw oneOfRequiredError('One of siteId, hostname, or getRootSite must be provided.', [
        'siteId',
        'hostname',
        'getRootSite'
      ]);
    }

    return {
      output: {
        siteId: site.id,
        siteName: site.displayName || site.name,
        siteDescription: site.description || null,
        webUrl: site.webUrl,
        createdDateTime: site.createdDateTime,
        lastModifiedDateTime: site.lastModifiedDateTime,
        hostname: site.siteCollection?.hostname
      },
      message: `Retrieved site **${site.displayName || site.name}** at ${site.webUrl}.`
    };
  })
  .build();
