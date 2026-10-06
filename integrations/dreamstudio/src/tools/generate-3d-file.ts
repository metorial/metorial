import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generate3DFile = SlateTool.create(spec, {
  name: 'Generate 3D Model File',
  key: 'generate_3d_file',
  description: 'Create a downloadable textured GLB model from one image using Stable Fast 3D.',
  instructions: [
    'Provide a clear view of a single subject. Generation consumes account credits.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      image: z.string().describe('Base64-encoded PNG, JPEG, or WebP image of the subject'),
      textureResolution: z.enum(['512', '1024', '2048']).default('1024'),
      foregroundRatio: z
        .number()
        .min(0.1)
        .max(1)
        .optional()
        .describe('Subject padding ratio; default 0.85'),
      remesh: z.enum(['none', 'triangle', 'quad']).optional()
    })
  )
  .output(z.object({ fileName: z.string(), mimeType: z.string(), format: z.literal('glb') }))
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).generateStableFast3D({
      ...ctx.input,
      textureResolution: Number(ctx.input.textureResolution)
    });
    let fileName = 'generated-model.glb';
    let mimeType = 'model/gltf-binary';
    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(Buffer.from(result.base64, 'base64')), {
        headers: { 'content-type': mimeType }
      }),
      filename: fileName
    });
    return {
      output: { fileName, mimeType, format: 'glb' as const },
      message: 'Created a downloadable GLB model.'
    };
  })
  .build();
