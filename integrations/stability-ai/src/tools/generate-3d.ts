import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generate3D = SlateTool.create(spec, {
  name: 'Generate 3D Model',
  key: 'generate_3d',
  description: `Generate 3D models from a single image using Stability AI's 3D generation models. Two models available:
- **stable-fast-3d**: Generates high-quality 3D assets in ~0.5 seconds. Best for quick prototyping.
- **spar3d** (Stable Point Aware 3D): More detailed generation with point cloud sampling. Better for complex objects and unseen backside details.

Both models output UV-unwrapped and textured GLB files ready for use in 3D applications and game engines.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      model: z
        .enum(['stable-fast-3d', 'spar3d'])
        .default('stable-fast-3d')
        .describe('3D generation model to use.'),
      image: z.string().describe('Base64-encoded image of the object to convert to 3D.'),
      textureResolution: z
        .enum(['512', '1024', '2048'])
        .optional()
        .describe('Resolution of the output texture in pixels.'),
      foregroundRatio: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Ratio of the foreground object in the image (e.g. 0.85).'),
      remesh: z
        .enum(['none', 'triangle', 'quad'])
        .optional()
        .describe('Remeshing operation for the output mesh.')
    })
  )
  .output(
    z.object({
      base64Model: z.string().describe('Base64-encoded GLB 3D model file.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result: { base64Model: string };

    if (input.model === 'stable-fast-3d') {
      result = await client.generateFast3D({
        image: input.image,
        textureResolution: input.textureResolution,
        foregroundRatio: input.foregroundRatio,
        remesh: input.remesh
      });
    } else {
      result = await client.generateSpar3D({
        image: input.image,
        textureResolution: input.textureResolution,
        foregroundRatio: input.foregroundRatio,
        remesh: input.remesh
      });
    }

    return {
      output: result,
      message: `Generated 3D model using **${input.model}**. Output is a GLB file encoded in base64.`
    };
  })
  .build();
