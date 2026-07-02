import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, fetchPipeline } from '../lib/client';
import { spec } from '../spec';

export let getPipelineTool = SlateTool.create(spec, {
  name: 'Get Pipeline',
  key: 'get_pipeline',
  description: `Fetch details of a specific pipeline by its ID or name. Returns the full pipeline configuration and metadata.`,
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
        .describe('Pipeline ID. Required if name is not provided.'),
      name: z
        .string()
        .optional()
        .describe('Pipeline name. Required if pipelineId is not provided.'),
      username: z.string().optional().describe('Username for name-based lookups'),
      orgName: z.string().optional().describe('Organization name for name-based lookups')
    })
  )
  .output(
    z.object({
      pipeline: z.record(z.string(), z.unknown()).describe('Full pipeline object')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await fetchPipeline(api, {
      pipelineId: ctx.input.pipelineId,
      name: ctx.input.name,
      username: ctx.input.username,
      orgName: ctx.input.orgName
    });

    return {
      output: {
        pipeline: result.object ?? result
      },
      message: `Retrieved pipeline details.`
    };
  })
  .build();
