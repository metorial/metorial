import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let publishTransformations = SlateTool.create(spec, {
  name: 'Publish Transformations',
  key: 'publish_transformations',
  description: `Publish one or more transformations and/or libraries in a single operation, making their latest revisions live for incoming event traffic. RudderStack runs validation tests before publishing to ensure no exceptions.`,
  instructions: [
    'At least one transformation ID or library ID must be provided.',
    'RudderStack validates code before publishing — check your code if publishing fails.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      testInput: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Optional test events for validation of transformation revisions. Code validation may perform external requests defined by your code.'
        ),
      transformationIds: z
        .array(z.string())
        .optional()
        .describe('IDs of transformations to publish'),
      libraryIds: z.array(z.string()).optional().describe('IDs of libraries to publish')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the publish operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({ token: ctx.auth.token, region: ctx.config.region });
    let { transformationIds, libraryIds, testInput } = ctx.input;
    if (!transformationIds?.length && !libraryIds?.length)
      throw createApiServiceError('Provide at least one transformation ID or library ID.');
    await client.publish({ transformationIds, libraryIds, testInput });
    return { output: { success: true }, message: 'Published the latest selected revisions.' };
  })
  .build();
