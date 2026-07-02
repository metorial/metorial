import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines & Stages',
  key: 'list_pipelines',
  description: `List pipelines and stages in Follow Up Boss. Returns available deal pipelines and contact lifecycle stages. Useful for finding stage/pipeline IDs when creating or updating deals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeStages: z
        .boolean()
        .optional()
        .describe('Set to true to also retrieve lifecycle stages'),
      limit: z.number().optional().describe('Number of results'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.number(),
            name: z.string().optional(),
            stages: z.array(z.any()).optional()
          })
        )
        .optional(),
      stages: z
        .array(
          z.object({
            stageId: z.number(),
            name: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let pipelinesResult = await client.listPipelines({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let pipelines = pipelinesResult.pipelines || [];

    let output: any = {
      pipelines: pipelines.map((p: any) => ({
        pipelineId: p.id,
        name: p.name,
        stages: p.stages
      }))
    };

    if (ctx.input.includeStages) {
      let stagesResult = await client.listStages({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let stages = stagesResult.stages || [];
      output.stages = stages.map((s: any) => ({
        stageId: s.id,
        name: s.name
      }));
    }

    return {
      output,
      message: `Found **${pipelines.length}** pipeline(s)${output.stages ? ` and **${output.stages.length}** stage(s)` : ''}.`
    };
  })
  .build();
