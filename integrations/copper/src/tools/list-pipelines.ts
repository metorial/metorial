import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List all pipelines and their stages in the Copper account. Pipelines define the sales process that opportunities move through. Use this to discover pipeline and stage IDs for creating or updating opportunities.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pipelineId: z
        .number()
        .optional()
        .describe('Optional: get stages for a specific pipeline ID only')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.number().describe('Pipeline ID'),
            name: z.string().describe('Pipeline name'),
            stages: z
              .array(
                z.object({
                  stageId: z.number().describe('Stage ID'),
                  name: z.string().describe('Stage name'),
                  winProbability: z
                    .number()
                    .optional()
                    .describe('Win probability for this stage')
                })
              )
              .optional()
              .describe('Pipeline stages')
          })
        )
        .describe('Available pipelines with their stages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let pipelines = await client.listPipelines();

    let results: any[] = [];
    for (let pipeline of pipelines) {
      if (ctx.input.pipelineId && pipeline.id !== ctx.input.pipelineId) continue;

      let stages = await client.listPipelineStages(pipeline.id);

      results.push({
        pipelineId: pipeline.id,
        name: pipeline.name,
        stages: stages.map((s: any) => ({
          stageId: s.id,
          name: s.name,
          winProbability: s.win_probability
        }))
      });
    }

    return {
      output: { pipelines: results },
      message: `Retrieved **${results.length}** pipeline(s) with stages.`
    };
  })
  .build();
