import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextPage } from '../lib/client';
import { spec } from '../spec';

export let listMaintenanceWindows = SlateTool.create(spec, {
  name: 'List Maintenance Windows',
  key: 'list_maintenance_windows',
  description: `List all maintenance windows on your StatusCake account. Maintenance windows suppress alerts during scheduled maintenance periods. Supports filtering by state.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      state: z
        .enum(['pending', 'active', 'paused'])
        .optional()
        .describe('Filter by maintenance window state'),
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of results per page, between 1 and 100')
    })
  )
  .output(
    z.object({
      windows: z
        .array(z.record(z.string(), z.any()))
        .describe('List of maintenance window objects'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Provider pagination metadata'),
      nextPage: z.number().optional().describe('Next page number, when more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMaintenanceWindows({
      state: ctx.input.state,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let windows = result.data;

    return {
      output: { windows, metadata: result.metadata, nextPage: nextPage(result.metadata) },
      message: `Found **${windows.length}** maintenance window(s).`
    };
  })
  .build();
