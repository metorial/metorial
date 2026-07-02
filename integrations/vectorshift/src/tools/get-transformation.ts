import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, fetchTransformation } from '../lib/client';
import { spec } from '../spec';

export let getTransformationTool = SlateTool.create(spec, {
  name: 'Get Transformation',
  key: 'get_transformation',
  description: `Fetch details of a specific transformation by its ID or name. Returns the full transformation configuration including function code, input/output schemas, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transformationId: z
        .string()
        .optional()
        .describe('Transformation ID. Required if name is not provided.'),
      name: z
        .string()
        .optional()
        .describe('Transformation name. Required if transformationId is not provided.'),
      username: z.string().optional().describe('Username for name-based lookups'),
      orgName: z.string().optional().describe('Organization name for name-based lookups')
    })
  )
  .output(
    z.object({
      transformation: z.record(z.string(), z.unknown()).describe('Full transformation object')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await fetchTransformation(api, {
      transformationId: ctx.input.transformationId,
      name: ctx.input.name,
      username: ctx.input.username,
      orgName: ctx.input.orgName
    });

    return {
      output: {
        transformation: result.object ?? result
      },
      message: `Retrieved transformation details.`
    };
  })
  .build();
