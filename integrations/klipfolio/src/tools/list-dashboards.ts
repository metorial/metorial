import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDashboards = SlateTool.create(spec, {
  name: 'List Dashboards',
  key: 'list_dashboards',
  description: `List dashboards (tabs) in your Klipfolio account. Supports filtering by client and pagination. Returns dashboard names, IDs, and metadata. Optionally includes full details like klip instances and share rights.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Filter dashboards by client ID'),
      includeDetails: z
        .boolean()
        .optional()
        .describe('Include full details (klip instances, share rights)'),
      limit: z.number().optional().describe('Maximum number of results (max 100)'),
      offset: z.number().optional().describe('Index of first result to return')
    })
  )
  .output(
    z.object({
      dashboards: z.array(
        z.object({
          dashboardId: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          createdBy: z.string().optional(),
          lastUpdated: z.string().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTabs({
      clientId: ctx.input.clientId,
      full: ctx.input.includeDetails,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let dashboards = (result?.data || []).map((tab: any) => ({
      dashboardId: tab.id,
      name: tab.name,
      description: tab.description,
      createdBy: tab.created_by,
      lastUpdated: tab.last_updated
    }));

    return {
      output: {
        dashboards,
        total: result?.meta?.total
      },
      message: `Found **${dashboards.length}** dashboard(s)${result?.meta?.total ? ` out of ${result.meta.total} total` : ''}.`
    };
  })
  .build();
