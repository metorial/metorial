import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let controlImage = SlateTool.create(spec, {
  name: 'Control Image Generation',
  key: 'control_image',
  description: `Generate images guided by structural inputs using Stability AI's control tools. Three control modes:
- **sketch**: Generate production-grade images from hand-drawn sketches or line drawings.
- **structure**: Generate images that maintain the structural composition and edges of a reference image.
- **style**: Generate new content in the visual style of a reference image (style transfer).

Each mode takes a reference image and a text prompt to guide the output.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mode: z.enum(['sketch', 'structure', 'style']).describe('Control mode to use.'),
      image: z
        .string()
        .describe(
          'Base64-encoded reference image (sketch, structural guide, or style reference).'
        ),
      prompt: z.string().describe('Text prompt describing the desired output image.'),
      negativePrompt: z
        .string()
        .optional()
        .describe('Text describing what to avoid in the output.'),
      controlStrength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'How strongly the reference guides the output (0-1). Used by sketch and structure modes.'
        ),
      fidelity: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('How closely to match the style reference (0-1). Used by style mode only.'),
      seed: z.number().optional().describe('Seed for reproducible results.'),
      outputFormat: z.enum(['png', 'jpeg', 'webp']).optional().describe('Output image format.')
    })
  )
  .output(
    z.object({
      base64Image: z.string().describe('Base64-encoded generated image.'),
      seed: z.number().describe('Seed used for this generation.'),
      finishReason: z.string().describe('Reason the generation finished.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result: { base64Image: string; seed: number; finishReason: string };

    switch (input.mode) {
      case 'sketch':
        result = await client.controlSketch({
          image: input.image,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          controlStrength: input.controlStrength,
          seed: input.seed,
          outputFormat: input.outputFormat
        });
        break;

      case 'structure':
        result = await client.controlStructure({
          image: input.image,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          controlStrength: input.controlStrength,
          seed: input.seed,
          outputFormat: input.outputFormat
        });
        break;

      case 'style':
        result = await client.controlStyle({
          image: input.image,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          fidelity: input.fidelity,
          seed: input.seed,
          outputFormat: input.outputFormat
        });
        break;
    }

    return {
      output: result,
      message: `Generated image using **${input.mode}** control with seed **${result.seed}**. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
