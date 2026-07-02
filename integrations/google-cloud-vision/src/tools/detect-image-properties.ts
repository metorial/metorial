import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { imageSourceSchema } from '../lib/schemas';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let detectImageProperties = SlateTool.create(spec, {
  name: 'Detect Image Properties',
  key: 'detect_image_properties',
  description: `Analyzes an image to determine its dominant colors, returning RGB values, coverage fraction, and relevance scores. Useful for color palette extraction, design workflows, and image categorization by color.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.detectImageProperties)
  .input(
    z.object({
      image: imageSourceSchema
    })
  )
  .output(
    z.object({
      dominantColors: z.array(
        z.object({
          red: z.number().describe('Red channel value (0-255)'),
          green: z.number().describe('Green channel value (0-255)'),
          blue: z.number().describe('Blue channel value (0-255)'),
          alpha: z.number().optional().describe('Alpha channel value (0-1)'),
          score: z.number().describe('Relevance score of this color'),
          pixelFraction: z
            .number()
            .describe('Fraction of pixels in the image that are this color')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new VisionClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.annotateImage(ctx.input.image, [{ type: 'IMAGE_PROPERTIES' }]);

    let annotation = result.imagePropertiesAnnotation;

    if (!annotation) {
      throw new Error('No image properties returned from Vision API');
    }

    let dominantColors = annotation.dominantColors.colors.map(c => ({
      red: c.color.red,
      green: c.color.green,
      blue: c.color.blue,
      alpha: c.color.alpha,
      score: c.score,
      pixelFraction: c.pixelFraction
    }));

    return {
      output: { dominantColors },
      message: `Detected **${dominantColors.length}** dominant colors in the image.`
    };
  })
  .build();
