import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let pipelineStageSchema = z.object({
  stageId: z.string().optional().describe('Stage ID'),
  label: z.string().describe('Stage label'),
  displayOrder: z.number().describe('Display order'),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .describe('Stage metadata (e.g., probability for deals)')
});

let pipelineOutputSchema = z.object({
  pipelineId: z.string().describe('Pipeline ID'),
  label: z.string().describe('Pipeline label'),
  displayOrder: z.number().optional().describe('Display order'),
  stages: z.array(pipelineStageSchema).describe('Pipeline stages'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List all pipelines for a given object type in HubSpot. Pipelines define the lifecycle stages for deals, tickets, or orders.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.listPipelines)
  .input(
    z.object({
      objectType: z
        .enum(['deals', 'tickets', 'orders'])
        .describe('Object type to list pipelines for')
    })
  )
  .output(
    z.object({
      pipelines: z.array(pipelineOutputSchema).describe('List of pipelines')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.listPipelines(ctx.input.objectType);

    let pipelines = (result.results || []).map((p: any) => ({
      pipelineId: p.id,
      label: p.label,
      displayOrder: p.displayOrder,
      stages: (p.stages || []).map((s: any) => ({
        stageId: s.id,
        label: s.label,
        displayOrder: s.displayOrder,
        metadata: s.metadata
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return {
      output: { pipelines },
      message: `Found **${pipelines.length}** ${ctx.input.objectType} pipelines`
    };
  })
  .build();

export let getPipeline = SlateTool.create(spec, {
  name: 'Get Pipeline',
  key: 'get_pipeline',
  description: `Retrieve a specific pipeline with its stages from HubSpot.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getPipeline)
  .input(
    z.object({
      objectType: z.enum(['deals', 'tickets', 'orders']).describe('Object type'),
      pipelineId: z.string().describe('Pipeline ID')
    })
  )
  .output(pipelineOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getPipeline(ctx.input.objectType, ctx.input.pipelineId);

    return {
      output: {
        pipelineId: result.id,
        label: result.label,
        displayOrder: result.displayOrder,
        stages: (result.stages || []).map((s: any) => ({
          stageId: s.id,
          label: s.label,
          displayOrder: s.displayOrder,
          metadata: s.metadata
        })),
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Retrieved pipeline **${result.label}** with ${result.stages?.length || 0} stages`
    };
  })
  .build();

export let createPipeline = SlateTool.create(spec, {
  name: 'Create Pipeline',
  key: 'create_pipeline',
  description: `Create a new pipeline with stages in HubSpot for deals, tickets, or orders.`,
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.createPipeline)
  .input(
    z.object({
      objectType: z.enum(['deals', 'tickets', 'orders']).describe('Object type'),
      label: z.string().describe('Pipeline name'),
      displayOrder: z.number().describe('Display order'),
      stages: z
        .array(
          z.object({
            label: z.string().describe('Stage label'),
            displayOrder: z.number().describe('Stage display order'),
            metadata: z
              .record(z.string(), z.string())
              .default({})
              .describe('Stage metadata (e.g., { "probability": "0.5" } for deals)')
          })
        )
        .describe('Pipeline stages')
    })
  )
  .output(pipelineOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.createPipeline(ctx.input.objectType, {
      label: ctx.input.label,
      displayOrder: ctx.input.displayOrder,
      stages: ctx.input.stages
    });

    return {
      output: {
        pipelineId: result.id,
        label: result.label,
        displayOrder: result.displayOrder,
        stages: (result.stages || []).map((s: any) => ({
          stageId: s.id,
          label: s.label,
          displayOrder: s.displayOrder,
          metadata: s.metadata
        })),
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Created pipeline **${result.label}** with ${result.stages?.length || 0} stages`
    };
  })
  .build();

export let deletePipeline = SlateTool.create(spec, {
  name: 'Delete Pipeline',
  key: 'delete_pipeline',
  description: `Delete a pipeline from HubSpot. All objects in the pipeline must be moved to another pipeline first.`,
  tags: { destructive: true, readOnly: false }
})
  .scopes(hubSpotActionScopes.deletePipeline)
  .input(
    z.object({
      objectType: z.enum(['deals', 'tickets', 'orders']).describe('Object type'),
      pipelineId: z.string().describe('Pipeline ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    await client.deletePipeline(ctx.input.objectType, ctx.input.pipelineId);

    return {
      output: { success: true },
      message: `Deleted ${ctx.input.objectType} pipeline (ID: ${ctx.input.pipelineId})`
    };
  })
  .build();
