import { SlateTool } from 'slates';
import { Client } from '../lib/client';
import { predictionInputSchema, predictionResponseSchema } from '../lib/schemas';
import { spec } from '../spec';

export let predictGenderV2 = SlateTool.create(spec, {
  name: 'Predict Gender (V2)',
  key: 'predict_gender_v2',
  description:
    'Estimate gender from a name, email address or username using the current API. Returns the original prediction, nullable confidence and sample count, prediction source, request ID and billing metadata. Estimates describe naming patterns and do not verify personal identity.',
  instructions: [
    'Confidence is a fraction from 0 to 1. Inspect confidence_kind to distinguish dataset frequency from an AI-reported score.',
    'AI defaults to fallback. Dataset lookup and automatic fallback cost 1 credit in total; aiMode always costs 2.',
    'forceToGenderize allows nickname or alias inference and requires fallback mode. It can cost 2 credits in total when AI is used.',
    'An unknown result is a successful, billable lookup. Inspect nullable fields and source instead of assuming an unknown result is an error.'
  ],
  tags: { readOnly: true }
})
  .input(predictionInputSchema)
  .output(predictionResponseSchema)
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).predictGender(ctx.input);
    return {
      output,
      message: `Prediction completed: ${output.data.gender ?? 'undetermined'}; source: ${output.data.source}. Request ID: ${output.meta.request_id}.`
    };
  })
  .build();
