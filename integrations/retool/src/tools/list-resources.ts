import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listResources = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description: `List all data source resources (database connections, API configurations, etc.) in the Retool organization. Supports pagination.`,
  constraints: ['Available on Enterprise Premium plan only.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of resources to return (1-100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      resources: z.array(
        z.object({
          resourceId: z.string(),
          resourceName: z.string(),
          resourceType: z.string().optional(),
          description: z.string().optional(),
          folderId: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listResources({
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    let resources = result.data.map(r => ({
      resourceId: r.id,
      resourceName: r.name,
      resourceType: r.type,
      description: r.description,
      folderId: r.folder_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return {
      output: {
        resources,
        totalCount: result.total_count,
        hasMore: result.has_more,
        nextToken: result.next_token
      },
      message: `Found **${result.total_count}** resources. Returned **${resources.length}** resources${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
