import { SlateTool } from 'slates';
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
  type: z.string().describe('Status type (e.g., "active", "archived")')
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
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let include = ctx.input.include ?? ['pipelines', 'leadStatuses', 'opportunityStatuses'];
    let includePipelines = include.includes('pipelines');
    let includeLeadStatuses = include.includes('leadStatuses');
    let includeOpportunityStatuses = include.includes('opportunityStatuses');

    let pipelinesResult: any = null;
    let leadStatusesResult: any = null;
    let opportunityStatusesResult: any = null;

    // Fetch pipelines if needed (also needed for opportunity status pipeline names)
    if (includePipelines || includeOpportunityStatuses) {
      pipelinesResult = await client.listPipelines();
    }

    if (includeLeadStatuses) {
      leadStatusesResult = await client.listLeadStatuses();
    }

    if (includeOpportunityStatuses) {
      opportunityStatusesResult = await client.listOpportunityStatuses();
    }

    let pipelineMap: Record<string, string> = {};
    let pipelines: any[] | undefined;
    if (pipelinesResult) {
      let pipelineData = pipelinesResult.data ?? [];
      pipelineData.forEach((p: any) => {
        pipelineMap[p.id] = p.name;
      });
      if (includePipelines) {
        pipelines = pipelineData.map((p: any) => ({
          pipelineId: p.id,
          name: p.name
        }));
      }
    }

    let leadStatuses: any[] | undefined;
    if (leadStatusesResult) {
      leadStatuses = (leadStatusesResult.data ?? []).map((s: any) => ({
        statusId: s.id,
        label: s.label,
        type: s.type
      }));
    }

    let opportunityStatuses: any[] | undefined;
    if (opportunityStatusesResult) {
      opportunityStatuses = (opportunityStatusesResult.data ?? []).map((s: any) => ({
        statusId: s.id,
        label: s.label,
        type: s.type,
        pipelineId: s.pipeline_id,
        pipelineName: pipelineMap[s.pipeline_id] ?? undefined
      }));
    }

    let parts: string[] = [];
    if (pipelines) parts.push(`${pipelines.length} pipeline(s)`);
    if (leadStatuses) parts.push(`${leadStatuses.length} lead status(es)`);
    if (opportunityStatuses)
      parts.push(`${opportunityStatuses.length} opportunity status(es)`);

    return {
      output: {
        ...(pipelines !== undefined ? { pipelines } : {}),
        ...(leadStatuses !== undefined ? { leadStatuses } : {}),
        ...(opportunityStatuses !== undefined ? { opportunityStatuses } : {})
      },
      message: `Retrieved ${parts.join(', ')}.`
    };
  })
  .build();
