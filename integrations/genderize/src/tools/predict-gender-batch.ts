import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { countryIdSchema, predictionOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let predictGenderBatch = SlateTool.create(spec, {
  name: 'Predict Gender Batch',
  key: 'predict_gender_batch',
  description:
    'Predict the gender statistically associated with up to 100 names in one request. Returns predictions in input order, supporting probabilities and data counts, and available quota headers. Optionally scope every name to one country.',
  instructions: [
    'Send the fullest names available. Split lists longer than 100 names into separate requests.',
    'Each name counts toward quota, including names with no prediction. A country code applies to the entire batch.',
    'Predictions describe population statistics, not individual identities. The provider returns male, female, or null; binary predictions do not represent non-binary identities.'
  ],
  constraints: ['Maximum of 100 names per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      names: z.array(z.string()).min(1).max(100).describe('Names to predict, in result order'),
      countryId: countryIdSchema
    })
  )
  .output(predictionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let output = await client.predictGender(ctx.input.names, ctx.input.countryId);
    return {
      output,
      message: `Returned ${output.predictions.length} statistical gender predictions.`
    };
  })
  .build();
