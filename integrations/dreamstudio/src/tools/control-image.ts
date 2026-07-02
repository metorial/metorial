import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let controlImage = SlateTool.create(spec, {
  name: 'Control Image',
  key: 'control_image',
  description: `Generate controlled variations of images using structural guidance. Three control modes:
- **sketch**: Transform rough sketches into polished images, guided by contour lines and edges
- **structure**: Maintain structural composition while restyling the content
- **style**: Transfer the visual style from a reference image to generate new content`,
  instructions: [
    'For sketch mode, provide a line drawing or sketch as the input image.',
    'For structure mode, the input image composition will be preserved while content is modified.',
    'For style mode, the input image style will be analyzed and applied to generate the prompt.',
    'Use controlStrength to balance between the reference image influence and creative freedom.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mode: z.enum(['sketch', 'structure', 'style']).describe('Control mode to apply'),
      image: z.string().describe('Base64-encoded reference/input image'),
      prompt: z.string().describe('Text description of the desired output'),
      controlStrength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('How strongly the input image influences the output (0-1)'),
      negativePrompt: z
        .string()
        .optional()
        .describe('What to exclude from the generated image'),
      seed: z
        .number()
        .int()
        .min(0)
        .max(4294967294)
        .optional()
        .describe('Seed for reproducible results'),
      outputFormat: z
        .enum(['png', 'jpeg', 'webp'])
        .optional()
        .default('png')
        .describe('Output image format')
    })
  )
  .output(
    z.object({
      base64: z.string().describe('Base64-encoded result image'),
      seed: z.number().describe('Seed used for this generation'),
      finishReason: z.string().describe('Finish reason (SUCCESS or CONTENT_FILTERED)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let params = {
      image: input.image,
      prompt: input.prompt,
      controlStrength: input.controlStrength,
      negativePrompt: input.negativePrompt,
      seed: input.seed,
      outputFormat: input.outputFormat
    };

    let result: { base64: string; seed: number; finishReason: string };

    switch (input.mode) {
      case 'sketch':
        result = await client.controlSketch(params);
        break;
      case 'structure':
        result = await client.controlStructure(params);
        break;
      case 'style':
        result = await client.controlStyle(params);
        break;
      default:
        throw new Error(`Unknown control mode: ${input.mode}`);
    }

    return {
      output: result,
      message: `Generated controlled image using **${input.mode}** mode with seed \`${result.seed}\`. Finish reason: ${result.finishReason}.`
    };
  })
  .build();
