import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { boundingPolySchema, imageSourceSchema } from '../lib/schemas';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let detectLandmarks = SlateTool.create(spec, {
  name: 'Detect Landmarks',
  key: 'detect_landmarks',
  description: `Identifies well-known natural and human-made landmarks in an image. Returns the landmark name, confidence score, bounding box, and geographical coordinates (latitude/longitude) when available. Useful for travel, geography, and location-based applications.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.detectLandmarks)
  .input(
    z.object({
      image: imageSourceSchema,
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of landmarks to return (default: 10)')
    })
  )
  .output(
    z.object({
      landmarks: z.array(
        z.object({
          landmarkId: z.string().describe('Machine-generated identifier for the landmark'),
          name: z.string().describe('Name of the detected landmark'),
          confidence: z.number().describe('Confidence score between 0 and 1'),
          boundingPoly: boundingPolySchema.describe('Bounding polygon around the landmark'),
          locations: z
            .array(
              z.object({
                latitude: z.number().describe('Latitude coordinate'),
                longitude: z.number().describe('Longitude coordinate')
              })
            )
            .describe('Known geographical locations of the landmark')
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
      { type: 'LANDMARK_DETECTION', maxResults: ctx.input.maxResults ?? 10 }
    ]);

    let landmarks = (result.landmarkAnnotations ?? []).map(lm => ({
      landmarkId: lm.mid,
      name: lm.description,
      confidence: lm.score,
      boundingPoly: lm.boundingPoly,
      locations: (lm.locations ?? []).map(loc => ({
        latitude: loc.latLng.latitude,
        longitude: loc.latLng.longitude
      }))
    }));

    return {
      output: { landmarks },
      message:
        landmarks.length > 0
          ? `Detected **${landmarks.length}** landmark(s): ${landmarks.map(l => l.name).join(', ')}`
          : 'No landmarks detected in the image.'
    };
  })
  .build();
