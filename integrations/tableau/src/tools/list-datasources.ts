import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDatasources = SlateTool.create(spec, {
  name: 'List Data Sources',
  key: 'list_datasources',
  description: `List and search data sources on the Tableau site. Supports pagination, filtering, and sorting.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of items per page'),
      pageNumber: z.number().optional().describe('Page number (1-based)'),
      filter: z.string().optional().describe('Filter expression (e.g., "name:eq:Sales Data")'),
      sort: z.string().optional().describe('Sort expression (e.g., "name:asc")')
    })
  )
  .output(
    z.object({
      datasources: z.array(
        z.object({
          datasourceId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          contentUrl: z.string().optional(),
          type: z.string().optional(),
          isCertified: z.boolean().optional(),
          certificationNote: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          projectId: z.string().optional(),
          projectName: z.string().optional(),
          ownerId: z.string().optional()
        })
      ),
      totalCount: z.number(),
      pageNumber: z.number(),
      pageSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.queryDatasources({
      pageSize: ctx.input.pageSize,
      pageNumber: ctx.input.pageNumber,
      filter: ctx.input.filter,
      sort: ctx.input.sort
    });

    let pagination = result.pagination || {};
    let datasources = (result.datasources?.datasource || []).map((d: any) => ({
      datasourceId: d.id,
      name: d.name,
      description: d.description,
      contentUrl: d.contentUrl,
      type: d.type,
      isCertified: d.isCertified,
      certificationNote: d.certificationNote,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      projectId: d.project?.id,
      projectName: d.project?.name,
      ownerId: d.owner?.id
    }));

    return {
      output: {
        datasources,
        totalCount: Number(pagination.totalAvailable || 0),
        pageNumber: Number(pagination.pageNumber || 1),
        pageSize: Number(pagination.pageSize || datasources.length)
      },
      message: `Found **${datasources.length}** data sources (${pagination.totalAvailable || 0} total).`
    };
  })
  .build();
