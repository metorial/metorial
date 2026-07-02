import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { boundingPolySchema, imageSourceSchema } from '../lib/schemas';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let detectLogos = SlateTool.create(spec, {
  name: 'Detect Logos',
  key: 'detect_logos',
  description: `Recognizes logos of popular brands within an image. Returns the brand name, confidence score, and bounding box for each detected logo. Useful for brand monitoring, market analysis, and detecting brand presence in social media images.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.detectLogos)
  .input(
    z.object({
      image: imageSourceSchema,
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of logos to return (default: 10)')
    })
  )
  .output(
    z.object({
      logos: z.array(
        z.object({
          logoId: z.string().describe('Machine-generated identifier for the logo'),
          name: z.string().describe('Name of the detected brand/logo'),
          confidence: z.number().describe('Confidence score between 0 and 1'),
          boundingPoly: boundingPolySchema.describe('Bounding polygon around the logo')
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
      { type: 'LOGO_DETECTION', maxResults: ctx.input.maxResults ?? 10 }
    ]);

    let logos = (result.logoAnnotations ?? []).map(logo => ({
      logoId: logo.mid,
      name: logo.description,
      confidence: logo.score,
      boundingPoly: logo.boundingPoly
    }));

    return {
      output: { logos },
      message:
        logos.length > 0
          ? `Detected **${logos.length}** logo(s): ${logos.map(l => l.name).join(', ')}`
          : 'No logos detected in the image.'
    };
  })
  .build();
