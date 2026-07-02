import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { boundingPolySchema, imageSourceSchema } from '../lib/schemas';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let detectObjects = SlateTool.create(spec, {
  name: 'Detect Objects',
  key: 'detect_objects',
  description: `Detects and localizes multiple objects in an image, returning each object's name, confidence score, and bounding box coordinates. Useful for understanding object positions and spatial relationships within an image. Object names are returned in English only.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.detectObjects)
  .input(
    z.object({
      image: imageSourceSchema,
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of objects to return (default: 10)')
    })
  )
  .output(
    z.object({
      objects: z.array(
        z.object({
          objectId: z.string().describe('Machine-generated identifier for the object'),
          name: z.string().describe('Name of the detected object (English only)'),
          confidence: z.number().describe('Confidence score between 0 and 1'),
          boundingPoly: boundingPolySchema.describe(
            'Bounding polygon around the detected object'
          )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new VisionClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.annotateImage(ctx.input.image, [
      { type: 'OBJECT_LOCALIZATION', maxResults: ctx.input.maxResults ?? 10 }
    ]);

    let objects = (result.localizedObjectAnnotations ?? []).map(obj => ({
      objectId: obj.mid,
      name: obj.name,
      confidence: obj.score,
      boundingPoly: obj.boundingPoly
    }));

    return {
      output: { objects },
      message:
        objects.length > 0
          ? `Detected **${objects.length}** objects: ${objects
              .slice(0, 5)
              .map(o => o.name)
              .join(', ')}${objects.length > 5 ? '...' : ''}`
          : 'No objects detected in the image.'
    };
  })
  .build();
