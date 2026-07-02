import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.clearout.io')
      .describe(
        'Clearout API base URL. May vary based on account type — check the Developer tab in the Clearout App.'
      )
  })
);
