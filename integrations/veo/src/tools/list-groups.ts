import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieve a paginated list of groups (communities) in VEO. Groups can be filtered by name, organisation, or creator. VEO supports four group types: Group (1), Video Bank (2), Community (3), and Cohort (4).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter groups by name'),
      organisationId: z.string().optional().describe('Filter by organisation ID'),
      createdByMe: z.boolean().optional().describe('If true, only return groups you created'),
      pageSize: z.number().optional().default(20).describe('Number of groups per page'),
      pageNumber: z
        .number()
        .optional()
        .default(1)
        .describe('Page number to retrieve (1-based)')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.any())).describe('List of group objects'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      totalItemCount: z.number().describe('Total number of groups matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let result = await client.listGroups({
      name: ctx.input.name,
      organisationId: ctx.input.organisationId,
      createdByMe: ctx.input.createdByMe,
      pageSize: ctx.input.pageSize,
      pageNumber: ctx.input.pageNumber
    });

    let items = result.Items ?? result.items ?? [];
    let totalItemCount = result.TotalItemCount ?? result.totalItemCount ?? 0;
    let page = result.Page ?? result.page ?? ctx.input.pageNumber;
    let pageSize = result.PageSize ?? result.pageSize ?? ctx.input.pageSize;

    return {
      output: { items, page, pageSize, totalItemCount },
      message: `Retrieved **${items.length}** groups (page ${page}, ${totalItemCount} total).`
    };
  })
  .build();
