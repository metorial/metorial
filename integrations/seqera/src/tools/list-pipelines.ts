import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List pre-configured pipelines in a Seqera workspace. Supports searching by name, pagination, and sorting. Returns pipeline configuration details including repository, compute environment, and labels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search filter for pipeline name'),
      max: z.number().optional().describe('Maximum number of results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination'),
      sortBy: z.string().optional().describe('Field to sort by, e.g. "name", "lastUpdated"'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.number().optional().describe('Pipeline ID'),
            name: z.string().optional().describe('Pipeline name'),
            description: z.string().optional().describe('Pipeline description'),
            repository: z.string().optional().describe('Pipeline repository URL'),
            computeEnvId: z.string().optional().describe('Compute environment ID'),
            revision: z.string().optional().describe('Pipeline revision/branch'),
            lastUpdated: z.string().optional().describe('Last updated timestamp')
          })
        )
        .describe('List of pipelines'),
      totalSize: z.number().optional().describe('Total number of pipelines')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.listPipelines({
      search: ctx.input.search,
      max: ctx.input.max,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy,
      sortDir: ctx.input.sortDirection,
      attributes: ['labels']
    });

    let pipelines = result.pipelines.map(p => ({
      pipelineId: p.pipelineId,
      name: p.name,
      description: p.description,
      repository: p.repository,
      computeEnvId: p.computeEnvId,
      revision: p.revision,
      lastUpdated: p.lastUpdated
    }));

    return {
      output: {
        pipelines,
        totalSize: result.totalSize
      },
      message: `Found **${pipelines.length}** pipelines${result.totalSize ? ` (${result.totalSize} total)` : ''}.`
    };
  })
  .build();
