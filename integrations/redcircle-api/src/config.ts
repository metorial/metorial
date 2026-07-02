import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    customerZipcode: z
      .string()
      .optional()
      .describe(
        'Default US zipcode to localize product results (shipping, availability). Must be pre-configured via the Zipcodes API.'
      )
  })
);
