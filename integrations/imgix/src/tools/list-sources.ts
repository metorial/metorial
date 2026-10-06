import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import {
  deploymentTypes,
  mapSource,
  pageNumber,
  pageSize,
  pagination,
  sourceOutput
} from '../lib/schemas';
import { spec } from '../spec';
export const listSources = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description:
    'Discover authorized source IDs and safe source configuration on one native zero-based page. Pass a source ID to asset and source tools.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      sort: z
        .enum(['name', '-name', 'date_deployed', '-date_deployed', 'enabled', '-enabled'])
        .optional(),
      filterName: z.string().optional(),
      filterEnabled: z.boolean().optional(),
      filterDeploymentType: deploymentTypes.optional(),
      pageNumber,
      pageSize
    })
  )
  .output(z.object({ sources: z.array(sourceOutput), pagination }))
  .handleInvocation(async ctx => {
    const result = await new ImgixClient(ctx.auth.token).listSources(ctx.input);
    return {
      output: {
        sources: result.data.map(source => mapSource(source)),
        pagination: result.meta.pagination
      },
      message: `Found ${result.data.length} source(s) on page ${result.meta.pagination.currentPage}.`
    };
  })
  .build();
