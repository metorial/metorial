import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { stabilityServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  createMediaAttachment,
  mediaAttachmentOutputSchema,
  toMediaAttachmentOutput
} from './shared';

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
        .max(2)
        .optional()
        .describe(
          'Foreground object ratio. stable-fast-3d supports 0.1-1.0; spar3d supports 1.0-2.0.'
        ),
      remesh: z
        .enum(['none', 'triangle', 'quad'])
        .optional()
        .describe('Remeshing operation for the output mesh.'),
      vertexCount: z
        .number()
        .min(-1)
        .max(20000)
        .optional()
        .describe('Target vertex count for stable-fast-3d. Use -1 for the default.'),
      targetType: z
        .enum(['none', 'vertex', 'face'])
        .optional()
        .describe('SPAR3D target type for targetCount.'),
      targetCount: z
        .number()
        .min(100)
        .max(20000)
        .optional()
        .describe('SPAR3D target count for vertices or faces.'),
      guidanceScale: z.number().min(1).max(10).optional().describe('SPAR3D guidance scale.'),
      seed: z.number().optional().describe('SPAR3D seed for reproducible results.')
    })
  )
  .output(mediaAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result: any;

    if (input.model === 'stable-fast-3d') {
      if (input.foregroundRatio !== undefined && input.foregroundRatio < 0.1) {
        throw stabilityServiceError(
          'stable-fast-3d foregroundRatio must be between 0.1 and 1.0.'
        );
      }
      if (input.foregroundRatio !== undefined && input.foregroundRatio > 1) {
        throw stabilityServiceError(
          'stable-fast-3d foregroundRatio must be between 0.1 and 1.0.'
        );
      }
      result = await client.generateFast3D({
        image: input.image,
        textureResolution: input.textureResolution,
        foregroundRatio: input.foregroundRatio,
        remesh: input.remesh,
        vertexCount: input.vertexCount
      });
    } else {
      if (input.foregroundRatio !== undefined && input.foregroundRatio < 1) {
        throw stabilityServiceError('spar3d foregroundRatio must be between 1.0 and 2.0.');
      }
      result = await client.generateSpar3D({
        image: input.image,
        textureResolution: input.textureResolution,
        foregroundRatio: input.foregroundRatio,
        remesh: input.remesh,
        targetType: input.targetType,
        targetCount: input.targetCount,
        guidanceScale: input.guidanceScale,
        seed: input.seed
      });
    }

    return {
      output: toMediaAttachmentOutput(result),
      attachments: [createMediaAttachment(result)],
      message: `Generated 3D model using **${input.model}**. Attachment MIME: \`${result.mimeType}\`.`
    };
  })
  .build();
