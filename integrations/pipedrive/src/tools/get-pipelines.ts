import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getPipelines = SlateTool.create(spec, {
  name: 'Get Pipelines & Stages',
  key: 'get_pipelines',
  description: `Retrieve pipelines and their stages from Pipedrive. Lists all pipelines with their stages, or fetches a specific pipeline or stage.
Use this to understand the sales pipeline structure and stage configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pipelineId: z
        .number()
        .optional()
        .describe('Specific pipeline ID to fetch (with its stages)'),
      stageId: z.number().optional().describe('Specific stage ID to fetch')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.number().describe('Pipeline ID'),
            name: z.string().describe('Pipeline name'),
            active: z.boolean().optional().describe('Whether active'),
            orderNr: z.number().optional().describe('Order number'),
            dealProbability: z
              .boolean()
              .optional()
              .describe('Whether deal probability is enabled'),
            addTime: z.string().optional().describe('Creation timestamp'),
            updateTime: z.string().optional().nullable().describe('Last update timestamp'),
            stages: z
              .array(
                z.object({
                  stageId: z.number().describe('Stage ID'),
                  name: z.string().describe('Stage name'),
                  orderNr: z.number().optional().describe('Order within pipeline'),
                  activeFlag: z.boolean().optional().describe('Whether active'),
                  rottingDays: z
                    .number()
                    .optional()
                    .nullable()
                    .describe('Days before rotting'),
                  dealsCount: z.number().optional().describe('Number of deals in stage')
                })
              )
              .optional()
              .describe('Stages in this pipeline')
          })
        )
        .describe('List of pipelines')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.stageId) {
      let result = await client.getStage(ctx.input.stageId);
      let stage = result?.data;
      if (!stage) {
        return { output: { pipelines: [] }, message: 'Stage not found.' };
      }
      return {
        output: {
          pipelines: [
            {
              pipelineId: stage.pipeline_id,
              name: stage.pipeline_name ?? `Pipeline ${stage.pipeline_id}`,
              stages: [
                {
                  stageId: stage.id,
                  name: stage.name,
                  orderNr: stage.order_nr,
                  activeFlag: stage.active_flag,
                  rottingDays: stage.rotten_days,
                  dealsCount: stage.deals_count
                }
              ]
            }
          ]
        },
        message: `Found stage **"${stage.name}"** (ID: ${stage.id}) in pipeline ${stage.pipeline_id}.`
      };
    }

    if (ctx.input.pipelineId) {
      let [pipelineResult, stagesResult] = await Promise.all([
        client.getPipeline(ctx.input.pipelineId),
        client.getStages(ctx.input.pipelineId)
      ]);

      let pipeline = pipelineResult?.data;
      let stages = (stagesResult?.data || []).map((s: any) => ({
        stageId: s.id,
        name: s.name,
        orderNr: s.order_nr,
        activeFlag: s.active_flag,
        rottingDays: s.rotten_days,
        dealsCount: s.deals_count
      }));

      return {
        output: {
          pipelines: pipeline
            ? [
                {
                  pipelineId: pipeline.id,
                  name: pipeline.name,
                  active: pipeline.active,
                  orderNr: pipeline.order_nr,
                  dealProbability: pipeline.deal_probability,
                  addTime: pipeline.add_time,
                  updateTime: pipeline.update_time,
                  stages
                }
              ]
            : []
        },
        message: pipeline
          ? `Found pipeline **"${pipeline.name}"** with **${stages.length}** stage(s).`
          : 'Pipeline not found.'
      };
    }

    // List all pipelines with stages
    let pipelinesResult = await client.getPipelines();
    let pipelines = await Promise.all(
      (pipelinesResult?.data || []).map(async (pipeline: any) => {
        let stagesResult = await client.getStages(pipeline.id);
        let stages = (stagesResult?.data || []).map((s: any) => ({
          stageId: s.id,
          name: s.name,
          orderNr: s.order_nr,
          activeFlag: s.active_flag,
          rottingDays: s.rotten_days,
          dealsCount: s.deals_count
        }));

        return {
          pipelineId: pipeline.id,
          name: pipeline.name,
          active: pipeline.active,
          orderNr: pipeline.order_nr,
          dealProbability: pipeline.deal_probability,
          addTime: pipeline.add_time,
          updateTime: pipeline.update_time,
          stages
        };
      })
    );

    return {
      output: { pipelines },
      message: `Found **${pipelines.length}** pipeline(s).`
    };
  });
