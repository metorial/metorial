import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { malformed } from '../lib/contracts';
import { spec } from '../spec';

export let listPipelinesStages = SlateTool.create(spec, {
  name: 'List Pipelines & Stages',
  key: 'list_pipelines_stages',
  description:
    'List a page of pipelines, stages, and closing outcomes in Nutshell CRM. Discover stage IDs and outcome IDs before updating a lead.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number (default: 1)')
    })
  )
  .output(
    z.object({
      milestones: z
        .array(
          z.object({
            milestoneId: z.number().describe('ID of the milestone/stage'),
            name: z.string().describe('Name of the milestone/stage'),
            entityType: z.string().optional().describe('Entity type'),
            pipelineId: z.number().optional().describe('Pipeline containing this stage')
          })
        )
        .describe('List of pipeline milestones/stages'),
      pipelines: z
        .array(z.object({ pipelineId: z.number(), name: z.string() }))
        .optional()
        .describe('Pipeline definitions for the requested page'),
      outcomes: z
        .array(z.object({ outcomeId: z.number(), description: z.string(), type: z.number() }))
        .optional()
        .describe(
          'Closing outcomes for the requested page; types 10=won, 11=lost, 12=canceled'
        ),
      count: z.number().describe('Number of milestones returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient(ctx.auth);
    let params = { limit: ctx.input.limit, page: ctx.input.page };
    let milestones = (await client.findMilestones(params)).map(stage => ({
      milestoneId: stage.id,
      name: stage.name,
      entityType: stage.entityType,
      pipelineId: stage.stagesetId
    }));
    let pipelines = (await client.findStagesets(params)).map(pipeline => ({
      pipelineId: pipeline.id,
      name: pipeline.name
    }));
    let outcomes = (await client.findLeadOutcomes(params)).map(outcome => {
      if (
        typeof outcome.type !== 'number' ||
        ![10, 11, 12].includes(outcome.type) ||
        typeof outcome.description !== 'string'
      )
        throw malformed();
      return { outcomeId: outcome.id, description: outcome.description, type: outcome.type };
    });
    return {
      output: { milestones, pipelines, outcomes, count: milestones.length },
      message: `Found ${milestones.length} stage(s), ${pipelines.length} pipeline(s), and ${outcomes.length} closing outcome(s).`
    };
  })
  .build();
