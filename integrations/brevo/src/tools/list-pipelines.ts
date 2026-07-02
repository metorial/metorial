import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `Retrieve all Brevo CRM deal pipelines and stages. Use this before creating or updating deals with pipeline or stage attributes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.string().describe('Pipeline ID'),
            name: z.string().describe('Pipeline name'),
            stages: z
              .array(
                z.object({
                  stageId: z.string().describe('Stage ID'),
                  name: z.string().describe('Stage name')
                })
              )
              .describe('Pipeline stages')
          })
        )
        .describe('Deal pipelines')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.listPipelines();
    let pipelines = (result ?? []).map((pipeline: any) => ({
      pipelineId: pipeline.pipeline,
      name: pipeline.pipeline_name,
      stages: (pipeline.stages ?? []).map((stage: any) => ({
        stageId: stage.id,
        name: stage.name
      }))
    }));

    return {
      output: { pipelines },
      message: `Retrieved **${pipelines.length}** pipelines.`
    };
  });
