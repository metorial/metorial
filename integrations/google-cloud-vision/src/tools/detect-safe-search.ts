import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { imageSourceSchema, likelihoodSchema } from '../lib/schemas';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let detectSafeSearch = SlateTool.create(spec, {
  name: 'Detect Safe Search',
  key: 'detect_safe_search',
  description: `Analyzes an image for explicit or inappropriate content across five categories: adult, spoof, medical, violence, and racy. Returns a likelihood rating for each category. Useful for content moderation and filtering.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.detectSafeSearch)
  .input(
    z.object({
      image: imageSourceSchema
    })
  )
  .output(
    z.object({
      adult: likelihoodSchema.describe('Likelihood of adult content'),
      spoof: likelihoodSchema.describe('Likelihood the image is a spoof or manipulated'),
      medical: likelihoodSchema.describe('Likelihood of medical content'),
      violence: likelihoodSchema.describe('Likelihood of violent content'),
      racy: likelihoodSchema.describe('Likelihood of racy content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VisionClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.annotateImage(ctx.input.image, [
      { type: 'SAFE_SEARCH_DETECTION' }
    ]);

    let annotation = result.safeSearchAnnotation;

    if (!annotation) {
      throw new Error('No safe search results returned from Vision API');
    }

    return {
      output: {
        adult: annotation.adult,
        spoof: annotation.spoof,
        medical: annotation.medical,
        violence: annotation.violence,
        racy: annotation.racy
      },
      message: `Safe search analysis complete — Adult: **${annotation.adult}**, Violence: **${annotation.violence}**, Racy: **${annotation.racy}**, Medical: **${annotation.medical}**, Spoof: **${annotation.spoof}**`
    };
  })
  .build();
