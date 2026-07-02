import { z } from 'zod';

export let recordSchema = z.record(z.string(), z.unknown());

export let listOutputSchema = z.object({
  records: z.array(z.unknown()).describe('Raw Finago records returned by the API.'),
  count: z.number().describe('Number of records returned by this call.'),
  pageCount: z.number().optional().describe('Number of API pages fetched.'),
  hasNextPage: z
    .boolean()
    .optional()
    .describe('Whether Finago advertised a next page in the Link header.'),
  nextLink: z.string().optional().describe('Finago Link header URL for the next page.')
});

export let recordOutputSchema = z.object({
  record: z.unknown().describe('Raw Finago record returned by the API.')
});

export let additionalFieldsSchema = recordSchema
  .optional()
  .describe('Additional Finago API fields to merge into the request body.');

export let dimensionsSchema = z
  .array(
    z.object({
      dimensionType: z.number().describe('Finago dimension type ID.'),
      value: z.string().describe('Dimension element value/key.'),
      name: z
        .string()
        .optional()
        .describe('Dimension element display name, required by some sales order APIs.')
    })
  )
  .optional()
  .describe('Finago dimensions such as project or department.');

export let addressSchema = z
  .object({
    street: z.string().optional(),
    postalCode: z.string().optional(),
    postalArea: z.string().optional(),
    city: z.string().optional(),
    countrySubdivision: z.string().optional(),
    countryCode: z.string().optional(),
    name: z.string().optional()
  })
  .describe('Finago address object.');

export let finitePositiveInteger = (description: string) =>
  z.number().int().positive().optional().describe(description);

export let maxPagesSchema = z
  .number()
  .int()
  .min(1)
  .max(25)
  .optional()
  .describe('Maximum number of paginated API pages to fetch. Defaults to 1.');
