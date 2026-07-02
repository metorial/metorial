import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generate3D = SlateTool.create(spec, {
  name: 'Generate 3D Asset',
  key: 'generate_3d',
  description: `Convert a single 2D image into a textured, UV-unwrapped 3D mesh (GLB format) using Stable Fast 3D. Generates in approximately 0.5 seconds. The output includes mesh, textures, and material properties.`,
  instructions: [
    'Provide a clear image with a well-defined subject for best 3D results.',
    'Use foregroundRatio to control how much of the image is treated as the subject.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      image: z.string().describe('Base64-encoded input image to convert to 3D'),
      textureResolution: z
        .enum(['512', '1024', '2048'])
        .optional()
        .default('1024')
        .describe('Resolution of the output texture in pixels'),
      foregroundRatio: z
        .number()
        .min(0.1)
        .max(1.0)
        .optional()
        .describe('How much of the image is foreground (0.1-1.0, default 0.85)'),
      remesh: z
        .enum(['none', 'triangle', 'quad'])
        .optional()
        .describe('Remeshing algorithm to apply to the output mesh')
    })
  )
  .output(
    z.object({
      base64: z.string().describe('Base64-encoded GLB (3D model) file data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let result = await client.generateStableFast3D({
      image: input.image,
      textureResolution: input.textureResolution
        ? Number.parseInt(input.textureResolution, 10)
        : undefined,
      foregroundRatio: input.foregroundRatio,
      remesh: input.remesh
    });

    return {
      output: result,
      message: `3D asset generated successfully in GLB format.`
    };
  })
  .build();
