import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let publish = SlateTool.create(spec, {
  name: 'Publish',
  key: 'publish',
  description: `Publish specific versions of transformations and/or libraries in a single operation. This makes the selected versions live for incoming event traffic.
Use **List Transformation Versions** or **List Library Versions** to find the version IDs you want to publish. This is also the mechanism for rolling back to a previous version.`,
  instructions: [
    'You must provide at least one transformation or library to publish.',
    'RudderStack runs automated tests during publishing to prevent code that causes exceptions from going live.',
    'You can optionally provide test event payloads for transformations to validate before publishing.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      transformations: z
        .array(
          z.object({
            versionId: z
              .string()
              .describe('Version ID of the transformation revision to publish'),
            testInput: z
              .array(z.any())
              .optional()
              .describe('Optional array of test event payloads to validate before publishing')
          })
        )
        .optional()
        .describe('Transformations to publish'),
      libraries: z
        .array(
          z.object({
            versionId: z.string().describe('Version ID of the library revision to publish')
          })
        )
        .optional()
        .describe('Libraries to publish')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the publish operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.publish({
      transformations: ctx.input.transformations,
      libraries: ctx.input.libraries
    });

    let tCount = ctx.input.transformations?.length ?? 0;
    let lCount = ctx.input.libraries?.length ?? 0;
    let parts: string[] = [];
    if (tCount > 0) parts.push(`**${tCount}** transformation(s)`);
    if (lCount > 0) parts.push(`**${lCount}** library/libraries`);

    return {
      output: { success: true },
      message: `Published ${parts.join(' and ')}.`
    };
  })
  .build();
