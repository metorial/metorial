import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, listPipelines } from '../lib/client';
import { spec } from '../spec';

export let listPipelinesTool = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List all pipelines in the VectorShift account. Optionally include shared pipelines and retrieve full pipeline details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeShared: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include pipelines shared with you'),
      verbose: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include full pipeline objects in the response')
    })
  )
  .output(
    z.object({
      pipelineIds: z.array(z.string()).describe('List of pipeline IDs'),
      pipelines: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Full pipeline objects (when verbose is true)')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await listPipelines(api, {
      includeShared: ctx.input.includeShared,
      verbose: ctx.input.verbose
    });

    return {
      output: {
        pipelineIds: result.object_ids ?? [],
        pipelines: result.objects
      },
      message: `Found **${(result.object_ids ?? []).length}** pipelines.`
    };
  })
  .build();
