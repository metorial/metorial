import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { countryIdSchema, predictionOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let predictGender = SlateTool.create(spec, {
  name: 'Predict Gender',
  key: 'predict_gender',
  description: `Predict the gender statistically associated with up to 10 names, optionally scoped to a country. Returns the provider's male, female, or unknown prediction, probability, supporting data count, and available quota headers. For up to 100 names, use predict_gender_batch.`,
  instructions: [
    'Send the fullest name available; the provider supports full names, diacritics, and non-Latin alphabets.',
    'A country code applies to all names. Check the supporting count; a global query may use more data.',
    'Predictions describe population statistics, not an individual identity. Binary predictions do not represent non-binary identities; null gender means no prediction was possible.'
  ],
  constraints: [
    'Maximum of 10 names per request; each name consumes quota.',
    'API-key requirements and available quota depend on the provider connection and plan.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      names: z
        .array(z.string())
        .min(1)
        .max(10)
        .describe('One or more names to predict gender for (max 10)'),
      countryId: countryIdSchema
    })
  )
  .output(predictionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let output = await client.predictGender(ctx.input.names, ctx.input.countryId);
    let { predictions } = output;

    let summary = predictions
      .map(p => {
        if (p.gender === null) {
          return `**${p.name}**: unknown`;
        }
        let probability =
          p.probability === null
            ? 'confidence unavailable'
            : `${Math.round(p.probability * 100)}% confidence`;
        return `**${p.name}**: ${p.gender} (${probability}, ${p.count} data points)`;
      })
      .join('\n');

    return {
      output,
      message: `Predicted gender for ${predictions.length} name${predictions.length === 1 ? '' : 's'}:\n${summary}`
    };
  })
  .build();
