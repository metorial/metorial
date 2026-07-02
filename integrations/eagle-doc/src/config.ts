import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://de.eagle-doc.com')
      .describe('Base URL for the Eagle Doc API. Default is the Frankfurt (Germany) instance.')
  })
);
