import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let predictGender = SlateTool.create(spec, {
  name: 'Predict Gender',
  key: 'predict_gender',
  description: `Predict the gender associated with one or more names using statistical data. Returns the predicted gender (male or female), a probability score indicating confidence, and the number of data rows examined. Supports up to 10 names in a single request. Optionally scope predictions to a specific country using an ISO 3166-1 alpha-2 country code for higher accuracy.`,
  instructions: [
    'Use first names for best results. If a full name is provided, the API will attempt to extract the first name.',
    'When using a country code, it applies to all names in the request. Check the count in results — if it is low, consider retrying without a country code for broader data.'
  ],
  constraints: [
    'Maximum of 10 names per request.',
    'Free tier is limited to 100 names per day.'
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
      countryId: z
        .string()
        .length(2)
        .optional()
        .describe(
          'ISO 3166-1 alpha-2 country code to scope the prediction (e.g. "US", "DE", "JP")'
        )
    })
  )
  .output(
    z.object({
      predictions: z
        .array(
          z.object({
            name: z.string().describe('The name that was queried'),
            gender: z
              .string()
              .nullable()
              .describe('Predicted gender ("male" or "female"), or null if unknown'),
            probability: z.number().nullable().describe('Confidence score between 0 and 1'),
            count: z.number().describe('Number of data rows examined for the prediction'),
            countryId: z
              .string()
              .optional()
              .describe('Country code used for localization, if provided')
          })
        )
        .describe('List of gender predictions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let predictions = await client.predictGender(ctx.input.names, ctx.input.countryId);

    let summary = predictions
      .map(p => {
        if (p.gender === null) {
          return `**${p.name}**: unknown`;
        }
        return `**${p.name}**: ${p.gender} (${Math.round((p.probability ?? 0) * 100)}% confidence, ${p.count} samples)`;
      })
      .join('\n');

    return {
      output: {
        predictions
      },
      message: `Predicted gender for ${predictions.length} name${predictions.length === 1 ? '' : 's'}:\n${summary}`
    };
  })
  .build();
