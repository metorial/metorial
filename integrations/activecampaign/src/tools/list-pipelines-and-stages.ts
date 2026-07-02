import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPipelinesAndStages = SlateTool.create(spec, {
  name: 'List Pipelines and Stages',
  key: 'list_pipelines_and_stages',
  description: `Lists all deal pipelines and their stages. Useful for finding pipeline and stage IDs needed when creating or updating deals.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pipelineId: z
        .string()
        .optional()
        .describe('If provided, only list stages for this pipeline')
    })
  )
  .output(
    z.object({
      pipelines: z.array(
        z.object({
          pipelineId: z.string(),
          title: z.string().optional(),
          stages: z
            .array(
              z.object({
                stageId: z.string(),
                title: z.string().optional(),
                order: z.number().optional()
              })
            )
            .optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let pipelineResult = await client.listPipelines({ limit: 100 });
    let pipelinesRaw = pipelineResult.dealGroups || [];

    if (ctx.input.pipelineId) {
      pipelinesRaw = pipelinesRaw.filter((p: any) => p.id === ctx.input.pipelineId);
    }

    let pipelines = await Promise.all(
      pipelinesRaw.map(async (p: any) => {
        let stageParams: Record<string, any> = { 'filters[d_groupid]': p.id, limit: 100 };
        let stageResult = await client.listStages(stageParams);
        let stages = (stageResult.dealStages || []).map((s: any) => ({
          stageId: s.id,
          title: s.title || undefined,
          order: s.order ? Number(s.order) : undefined
        }));

        return {
          pipelineId: p.id,
          title: p.title || undefined,
          stages
        };
      })
    );

    return {
      output: { pipelines },
      message: `Found **${pipelines.length}** pipelines with their stages.`
    };
  })
  .build();
