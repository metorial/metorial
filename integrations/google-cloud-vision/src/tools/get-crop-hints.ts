import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { boundingPolySchema, imageSourceSchema } from '../lib/schemas';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let getCropHints = SlateTool.create(spec, {
  name: 'Get Crop Hints',
  key: 'get_crop_hints',
  description: `Suggests optimal crop regions for an image based on its content. You can specify target aspect ratios (width/height) and the API returns bounding boxes with confidence scores. Useful for automated image cropping, thumbnail generation, and responsive image preparation.`,
  instructions: [
    'Aspect ratios are expressed as width divided by height (e.g., 1.0 for square, 1.78 for 16:9).',
    'You can supply up to 16 aspect ratios. If none are specified, the best possible crop is returned.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.getCropHints)
  .input(
    z.object({
      image: imageSourceSchema,
      aspectRatios: z
        .array(z.number())
        .optional()
        .describe(
          'Target aspect ratios as width/height (e.g., [1.0, 1.78] for square and 16:9). Up to 16 ratios.'
        )
    })
  )
  .output(
    z.object({
      cropHints: z.array(
        z.object({
          boundingPoly: boundingPolySchema.describe('Suggested crop region'),
          confidence: z.number().describe('Confidence score for this crop suggestion'),
          importanceFraction: z
            .number()
            .describe('Fraction of important content within the crop region')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new VisionClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let imageContext = ctx.input.aspectRatios
      ? { cropHintsParams: { aspectRatios: ctx.input.aspectRatios } }
      : undefined;

    let result = await client.annotateImage(
      ctx.input.image,
      [{ type: 'CROP_HINTS' }],
      imageContext
    );

    let annotation = result.cropHintsAnnotation;

    if (!annotation) {
      throw new Error('No crop hints returned from Vision API');
    }

    let cropHints = annotation.cropHints.map(hint => ({
      boundingPoly: hint.boundingPoly,
      confidence: hint.confidence,
      importanceFraction: hint.importanceFraction
    }));

    return {
      output: { cropHints },
      message: `Received **${cropHints.length}** crop suggestion(s) for the image.`
    };
  })
  .build();
