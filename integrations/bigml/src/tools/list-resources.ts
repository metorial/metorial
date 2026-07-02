import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let resourceTypeEnum = z.enum([
  'source',
  'dataset',
  'model',
  'ensemble',
  'deepnet',
  'logisticregression',
  'linearregression',
  'prediction',
  'batchprediction',
  'evaluation',
  'cluster',
  'anomaly',
  'association',
  'topicmodel',
  'timeseries',
  'pca',
  'fusion',
  'optiml',
  'script',
  'library',
  'execution',
  'project',
  'externalconnector',
  'configuration'
]);

export let listResources = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description: `List BigML resources of a given type with filtering, ordering, and pagination. Returns a paginated list of resources along with metadata about the total count and navigation.
Use filters to narrow results by name, tags, creation date, and other resource-specific fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: resourceTypeEnum.describe('Type of resource to list'),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of results to return (default 20)'),
      offset: z.number().optional().describe('Offset for pagination'),
      orderBy: z
        .string()
        .optional()
        .describe('Field to sort by. Prefix with "-" for descending order (e.g., "-created")'),
      name: z.string().optional().describe('Filter by exact name'),
      tags: z.string().optional().describe('Filter by tag'),
      projectId: z.string().optional().describe('Filter by project ID'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Additional API filters as key-value pairs (e.g., {"created__gt": "2024-01-01", "size__gt": "1048576"})'
        )
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching resources'),
      limit: z.number().describe('Number of results per page'),
      offset: z.number().describe('Current offset'),
      hasMore: z.boolean().describe('Whether there are more results available'),
      resources: z
        .array(
          z.object({
            resourceId: z.string().describe('Resource ID'),
            name: z.string().optional().describe('Resource name'),
            statusCode: z.number().optional().describe('Status code'),
            statusMessage: z.string().optional().describe('Status message'),
            created: z.string().optional().describe('Creation timestamp'),
            updated: z.string().optional().describe('Last updated timestamp'),
            tags: z.array(z.string()).optional().describe('Resource tags')
          })
        )
        .describe('List of matching resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listResources(ctx.input.resourceType, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderBy: ctx.input.orderBy,
      name: ctx.input.name,
      tags: ctx.input.tags,
      project: ctx.input.projectId,
      filters: ctx.input.filters
    });

    let resources = result.objects.map(obj => ({
      resourceId: obj.resource,
      name: obj.name,
      statusCode: obj.status?.code,
      statusMessage: obj.status?.message,
      created: obj.created,
      updated: obj.updated,
      tags: obj.tags
    }));

    let totalCount = result.meta.total_count;
    let offset = result.meta.offset;
    let limit = result.meta.limit;
    let hasMore = !!result.meta.next;

    return {
      output: {
        totalCount,
        limit,
        offset,
        hasMore,
        resources
      },
      message: `Found **${totalCount}** ${ctx.input.resourceType}(s). Showing ${resources.length} results (offset ${offset}).${hasMore ? ' More results available.' : ''}`
    };
  })
  .build();
