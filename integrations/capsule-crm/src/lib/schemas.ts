import { z } from 'zod';

export let customFieldValuesSchema = z
  .array(
    z.object({
      definitionId: z
        .number()
        .int()
        .positive()
        .describe('Existing custom field definition ID'),
      value: z
        .union([z.string(), z.number(), z.boolean()])
        .describe(
          'Value matching the field definition: text/date/list/link as a string, number as a string or number, or boolean'
        )
    })
  )
  .optional()
  .describe('Custom field values to set using existing definition IDs');

export let websiteServiceSchema = z.enum([
  'URL',
  'SKYPE',
  'TWITTER',
  'LINKED_IN',
  'FACEBOOK',
  'XING',
  'FEED',
  'GOOGLE_PLUS',
  'FLICKR',
  'GITHUB',
  'YOUTUBE',
  'INSTAGRAM',
  'PINTEREST'
]);
