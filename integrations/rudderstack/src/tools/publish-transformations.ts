import { SlateTool } from 'slates';
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
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
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
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { transformationIds, libraryIds } = ctx.input;

    if (!transformationIds?.length && !libraryIds?.length) {
      throw new Error('At least one transformation ID or library ID must be provided.');
    }

    await client.publish({ transformationIds, libraryIds });

    let parts: string[] = [];
    if (transformationIds?.length)
      parts.push(`**${transformationIds.length}** transformation(s)`);
    if (libraryIds?.length) parts.push(`**${libraryIds.length}** library(ies)`);

    return {
      output: { success: true },
      message: `Successfully published ${parts.join(' and ')}.`
    };
  })
  .build();
