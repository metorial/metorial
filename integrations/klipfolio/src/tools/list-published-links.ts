import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateInput } from '../lib/contracts';
import { spec } from '../spec';

export let listPublishedLinks = SlateTool.create(spec, {
  name: 'List Published Links',
  key: 'list_published_links',
  description: `List published links for sharing dashboards externally. Filter by client or dashboard. Returns link URLs, visibility settings, and access details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Filter by client ID'),
      dashboardId: z
        .string()
        .optional()
        .describe(
          'Dashboard ID whose published links to list; required by the current API. Discover IDs with list_dashboards.'
        ),
      limit: z.number().optional().describe('Maximum number of results (max 100)'),
      offset: z.number().optional().describe('Index of first result to return')
    })
  )
  .output(
    z.object({
      publishedLinks: z.array(
        z.object({
          linkId: z.string().optional(),
          name: z.string().optional(),
          dashboardUrl: z.string().optional(),
          visibility: z.string().optional(),
          dateCreated: z.string().optional(),
          dateLastAccessed: z.string().optional()
        })
      ),
      total: z.number().optional(),
      nextOffset: z.number().optional(),
      hasMore: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPublishedLinks({
      clientId: ctx.input.clientId,
      dashboardId: ctx.input.dashboardId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let publishedLinks = (result?.data || []).map((link: any) => ({
      linkId: link.id,
      name: link.published_link_name,
      dashboardUrl: link.dashboard_url,
      visibility: link.visibility,
      dateCreated: link.date_created,
      dateLastAccessed: link.date_last_accessed
    }));

    const offset = ctx.input.offset ?? 0;
    const hasMore =
      result.data.length > 0 &&
      (typeof result.meta?.total === 'number'
        ? offset + publishedLinks.length < result.meta.total
        : publishedLinks.length === (ctx.input.limit ?? 25));
    return {
      output: {
        publishedLinks,
        total: result?.meta?.total,
        hasMore,
        nextOffset: hasMore ? offset + publishedLinks.length : undefined
      },
      message: `Found **${publishedLinks.length}** published link(s)${result?.meta?.total ? ` out of ${result.meta.total} total` : ''}.`
    };
  })
  .build();
