import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { stabilityServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  createMediaAttachment,
  imageOutputFormatEnum,
  mediaAttachmentOutputSchema,
  stylePresetEnum,
  toMediaAttachmentOutput
} from './shared';

export let controlImage = SlateTool.create(spec, {
  name: 'Control Image Generation',
  key: 'control_image',
  description: `Generate images guided by structural inputs using Stability AI's control tools. Four control modes:
- **sketch**: Generate production-grade images from hand-drawn sketches or line drawings.
- **structure**: Generate images that maintain the structural composition and edges of a reference image.
- **style**: Generate new content in the visual style of a reference image (Style Guide).
- **style_transfer**: Restyle an existing image with a separate style reference while preserving composition.

Sketch, structure, and style guide require a reference image and prompt. Style transfer requires an input image and styleImage; prompt is optional.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mode: z
        .enum(['sketch', 'structure', 'style', 'style_transfer'])
        .describe('Control mode to use.'),
      image: z
        .string()
        .describe(
          'Base64-encoded reference image. For style_transfer, this is the init/content image to restyle.'
        ),
      prompt: z
        .string()
        .optional()
        .describe(
          'Text prompt describing the desired output image. Required for sketch, structure, and style; optional for style_transfer.'
        ),
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
      styleImage: z
        .string()
        .optional()
        .describe('Base64-encoded style reference image. Required for style_transfer mode.'),
      styleStrength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('How much influence styleImage has. Used by style_transfer mode.'),
      compositionFidelity: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'How closely the output follows the input composition. Used by style_transfer.'
        ),
      changeStrength: z
        .number()
        .min(0.1)
        .max(1)
        .optional()
        .describe('How much the original image should change. Used by style_transfer.'),
      seed: z.number().optional().describe('Seed for reproducible results.'),
      stylePreset: stylePresetEnum,
      outputFormat: imageOutputFormatEnum
    })
  )
  .output(mediaAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result: any;

    switch (input.mode) {
      case 'sketch':
        if (!input.prompt) throw stabilityServiceError('prompt is required for sketch mode.');
        result = await client.controlSketch({
          image: input.image,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          controlStrength: input.controlStrength,
          seed: input.seed,
          outputFormat: input.outputFormat,
          stylePreset: input.stylePreset
        });
        break;

      case 'structure':
        if (!input.prompt)
          throw stabilityServiceError('prompt is required for structure mode.');
        result = await client.controlStructure({
          image: input.image,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          controlStrength: input.controlStrength,
          seed: input.seed,
          outputFormat: input.outputFormat,
          stylePreset: input.stylePreset
        });
        break;

      case 'style':
        if (!input.prompt) throw stabilityServiceError('prompt is required for style mode.');
        result = await client.controlStyle({
          image: input.image,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          fidelity: input.fidelity,
          seed: input.seed,
          outputFormat: input.outputFormat,
          stylePreset: input.stylePreset
        });
        break;

      case 'style_transfer':
        if (!input.styleImage)
          throw stabilityServiceError('styleImage is required for style_transfer mode.');
        result = await client.styleTransfer({
          initImage: input.image,
          styleImage: input.styleImage,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          seed: input.seed,
          styleStrength: input.styleStrength,
          compositionFidelity: input.compositionFidelity,
          changeStrength: input.changeStrength,
          outputFormat: input.outputFormat
        });
        break;
    }

    return {
      output: toMediaAttachmentOutput(result),
      attachments: [createMediaAttachment(result)],
      message: `Generated image using **${input.mode}** control. Attachment MIME: \`${result.mimeType}\`.`
    };
  })
  .build();
