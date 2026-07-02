import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountEmail: z
      .string()
      .describe(
        'The email address associated with your Doppler account. Used in all API request paths.'
      )
  })
);
