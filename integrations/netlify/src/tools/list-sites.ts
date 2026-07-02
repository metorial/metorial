import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSites = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description: `List all Netlify sites accessible by the authenticated user. Supports filtering and pagination to browse through large numbers of sites.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .enum(['all', 'owner', 'guest'])
        .optional()
        .describe(
          'Filter sites by ownership. "all" returns all sites, "owner" returns sites owned by the user, "guest" returns sites where the user is a collaborator.'
        ),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of sites per page (default 100, max 100)')
    })
  )
  .output(
    z.object({
      sites: z.array(
        z.object({
          siteId: z.string().describe('Unique site identifier'),
          name: z.string().describe('Site name'),
          url: z.string().describe('Primary site URL'),
          sslUrl: z.string().optional().describe('SSL URL of the site'),
          adminUrl: z.string().optional().describe('Netlify admin URL for the site'),
          customDomain: z.string().optional().describe('Custom domain if configured'),
          state: z.string().optional().describe('Current site state'),
          createdAt: z.string().optional().describe('Site creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp'),
          accountSlug: z.string().optional().describe('Account slug the site belongs to')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let sites = await client.listSites({
      filter: ctx.input.filter,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = sites.map((site: any) => ({
      siteId: site.id,
      name: site.name || '',
      url: site.url || '',
      sslUrl: site.ssl_url ?? undefined,
      adminUrl: site.admin_url ?? undefined,
      customDomain: site.custom_domain ?? undefined,
      state: site.state ?? undefined,
      createdAt: site.created_at ?? undefined,
      updatedAt: site.updated_at ?? undefined,
      accountSlug: site.account_slug ?? undefined
    }));

    return {
      output: { sites: mapped },
      message: `Found **${mapped.length}** site(s).`
    };
  })
  .build();
