import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pipelineSchema = z.object({
  pipelineId: z.string().describe('Unique identifier for the pipeline'),
  name: z.string().describe('Pipeline name')
});

let leadStatusSchema = z.object({
  statusId: z.string().describe('Unique identifier for the lead status'),
  label: z.string().describe('Display label for the status'),
  type: z
    .string()
    .optional()
    .describe('Status type, only if supplied by Close; lead statuses ordinarily have no type')
});

let opportunityStatusSchema = z.object({
  statusId: z.string().describe('Unique identifier for the opportunity status'),
  label: z.string().describe('Display label for the status'),
  type: z.string().describe('Status type (e.g., "active", "won", "lost")'),
  pipelineId: z.string().describe('ID of the pipeline this status belongs to'),
  pipelineName: z.string().optional().describe('Name of the pipeline this status belongs to')
});

export let listPipelinesAndStatuses = SlateTool.create(spec, {
  name: 'List Pipelines and Statuses',
  key: 'list_pipelines_and_statuses',
  description: `List pipelines, lead statuses, and/or opportunity statuses in Close. Useful for understanding the sales pipeline configuration, looking up status IDs for filtering or updating leads/opportunities, and seeing available pipeline stages.`,
  instructions: [
    'By default, all three resource types (pipelines, leadStatuses, opportunityStatuses) are returned.',
    'Use the include parameter to fetch only specific resource types for better performance.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      include: z
        .array(z.enum(['pipelines', 'leadStatuses', 'opportunityStatuses']))
        .optional()
        .describe('Which resource types to include. Defaults to all three if omitted.')
    })
  )
  .output(
    z.object({
      pipelines: z.array(pipelineSchema).optional().describe('List of pipelines'),
      leadStatuses: z.array(leadStatusSchema).optional().describe('List of lead statuses'),
      opportunityStatuses: z
        .array(opportunityStatusSchema)
        .optional()
        .describe('List of opportunity statuses')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const include = ctx.input.include ?? ['pipelines', 'leadStatuses', 'opportunityStatuses'];
    const pipelinePage =
      include.includes('pipelines') || include.includes('opportunityStatuses')
        ? await client.listPipelines()
        : undefined;
    const leadPage = include.includes('leadStatuses')
      ? await client.listLeadStatuses()
      : undefined;
    const opportunityPage = include.includes('opportunityStatuses')
      ? await client.listOpportunityStatuses()
      : undefined;
    if (pipelinePage?.has_more || leadPage?.has_more || opportunityPage?.has_more)
      throw createApiServiceError(
        'Close returned incomplete configuration lists. Configuration pagination is not available through this tool.'
      );
    const names = new Map(pipelinePage?.data.map(p => [p.id, p.name]));
    return {
      output: {
        pipelines: include.includes('pipelines')
          ? pipelinePage?.data.map(p => ({ pipelineId: p.id, name: p.name }))
          : undefined,
        leadStatuses: leadPage?.data.map(s => ({
          statusId: s.id,
          label: s.label,
          type: s.type ?? undefined
        })),
        opportunityStatuses: opportunityPage?.data.map(s => ({
          statusId: s.id,
          label: s.label,
          type: s.type,
          pipelineId: s.pipeline_id,
          pipelineName: names.get(s.pipeline_id)
        }))
      },
      message: 'Retrieved the requested sales configuration.'
    };
  })
  .build();
