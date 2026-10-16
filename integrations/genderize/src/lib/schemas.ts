import { z } from 'zod';

export let countryIdSchema = z
  .string()
  .length(2)
  .optional()
  .describe('ISO 3166-1 alpha-2 country code to scope every prediction, such as US or DE');

export let predictionOutputSchema = z.object({
  predictions: z
    .array(
      z.object({
        name: z.string().describe('The name echoed by the provider'),
        gender: z
          .string()
          .nullable()
          .describe('Predicted gender ("male" or "female"), or null if unknown'),
        probability: z
          .number()
          .nullable()
          .describe('Provider confidence between 0 and 1, or null when unavailable'),
        count: z.number().describe('Number of data points behind the prediction'),
        countryId: z
          .string()
          .optional()
          .describe('Country code echoed by the provider, when returned as a string'),
        raw: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Complete provider prediction, including nulls and additional fields')
      })
    )
    .describe('List of gender predictions'),
  rateLimit: z
    .object({
      limit: z.number().optional().describe('Names allowed in the current quota window'),
      remaining: z.number().optional().describe('Names remaining in the current quota window'),
      resetSeconds: z.number().optional().describe('Seconds until the quota window resets')
    })
    .optional()
    .describe('Quota values read from the response headers; unavailable values are omitted')
});
