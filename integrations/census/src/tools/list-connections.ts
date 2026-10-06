import { SlateTool } from 'slates';
import { z } from 'zod';
import { workspaceClient } from '../lib/client';
import { allPages, pageMetadata, paginationOutput, workspaceId } from '../lib/schemas';
import { spec } from '../spec';

const connectionSchema = z.object({
  connectionId: z.number(),
  name: z.string().optional(),
  label: z.string().nullish(),
  type: z.string().optional(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  lastTestSucceeded: z.boolean().nullish()
});
export const listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description:
    'Lists a page of source and/or destination connections without credentials or connection configuration. Set allPages to follow the complete documented pagination chain.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId,
      allPages,
      connectionType: z.enum(['sources', 'destinations', 'both']).optional().default('both'),
      page: z.number().optional().describe('Page number; 0 selects page 1.'),
      perPage: z.number().optional().describe('Results per page, 1–100.')
    })
  )
  .output(
    z.object({
      sources: z.array(connectionSchema).optional(),
      destinations: z.array(connectionSchema).optional(),
      sourcesPagination: z.object(paginationOutput).optional(),
      destinationsPagination: z.object(paginationOutput).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = await workspaceClient(ctx);
    const params = {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      allPages: ctx.input.allPages
    };
    const source =
      ctx.input.connectionType !== 'destinations'
        ? await client.listSources(params)
        : undefined;
    const destination =
      ctx.input.connectionType !== 'sources'
        ? await client.listDestinations(params)
        : undefined;
    const map = (row: NonNullable<typeof source>['sources'][number]) => ({
      connectionId: row.id,
      name: row.name,
      label: row.label,
      type: row.type,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastTestSucceeded: row.lastTestSucceeded
    });
    return {
      output: {
        sources: source?.sources.map(map),
        destinations: destination?.destinations.map(map),
        sourcesPagination: source
          ? pageMetadata(source.sources.length, source.pagination)
          : undefined,
        destinationsPagination: destination
          ? pageMetadata(destination.destinations.length, destination.pagination)
          : undefined
      },
      message: 'Retrieved connection metadata.'
    };
  })
  .build();
