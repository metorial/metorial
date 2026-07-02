import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let stageSchema = z.object({
  stageId: z.number().describe('Stage/status ID'),
  name: z.string().describe('Stage name'),
  sort: z.number().describe('Sort order'),
  color: z.string().optional().describe('Stage color'),
  isEditable: z.boolean().optional().describe('Whether the stage can be edited'),
  pipelineId: z.number().optional().describe('Parent pipeline ID')
});

let pipelineSchema = z.object({
  pipelineId: z.number().describe('Pipeline ID'),
  name: z.string().describe('Pipeline name'),
  sort: z.number().optional().describe('Sort order'),
  isMain: z.boolean().optional().describe('Whether this is the main pipeline'),
  isArchive: z.boolean().optional().describe('Whether this is an archive pipeline'),
  stages: z.array(stageSchema).optional().describe('Pipeline stages/statuses')
});

export let listPipelinesTool = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List all sales pipelines and their stages. Each pipeline contains ordered stages that represent steps in the sales process. Use this to discover available pipelines and stage IDs for creating or moving leads.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pipelineId: z
        .number()
        .optional()
        .describe('Get a specific pipeline by ID. If omitted, returns all pipelines.')
    })
  )
  .output(
    z.object({
      pipelines: z.array(pipelineSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let pipelines: any[];

    if (ctx.input.pipelineId) {
      let pipeline = await client.getPipeline(ctx.input.pipelineId);
      pipelines = [pipeline];
    } else {
      pipelines = await client.listPipelines();
    }

    let mapped = pipelines.map((p: any) => ({
      pipelineId: p.id,
      name: p.name,
      sort: p.sort,
      isMain: p.is_main,
      isArchive: p.is_archive,
      stages: (p._embedded?.statuses || []).map((s: any) => ({
        stageId: s.id,
        name: s.name,
        sort: s.sort,
        color: s.color,
        isEditable: s.is_editable,
        pipelineId: s.pipeline_id
      }))
    }));

    return {
      output: { pipelines: mapped },
      message: `Found **${mapped.length}** pipeline(s).`
    };
  })
  .build();
