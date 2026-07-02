import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, listTransformations } from '../lib/client';
import { spec } from '../spec';

export let listTransformationsTool = SlateTool.create(spec, {
  name: 'List Transformations',
  key: 'list_transformations',
  description: `List all transformations in the VectorShift account. Optionally include shared transformations and retrieve full details.`,
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
        .describe('Include transformations shared with you'),
      verbose: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include full transformation objects in the response')
    })
  )
  .output(
    z.object({
      transformationIds: z.array(z.string()).describe('List of transformation IDs'),
      transformations: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Full transformation objects (when verbose is true)')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await listTransformations(api, {
      includeShared: ctx.input.includeShared,
      verbose: ctx.input.verbose
    });

    return {
      output: {
        transformationIds: result.object_ids ?? [],
        transformations: result.objects
      },
      message: `Found **${(result.object_ids ?? []).length}** transformations.`
    };
  })
  .build();
