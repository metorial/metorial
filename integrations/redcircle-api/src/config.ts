import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    customerZipcode: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default US zipcode to localize product results (shipping, availability). Must be pre-configured via the Zipcodes API.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
