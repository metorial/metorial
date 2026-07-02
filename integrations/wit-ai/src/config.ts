import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z
      .string()
      .default('20240304')
      .describe('Wit.ai API version date (format: YYYYMMDD). Defaults to 20240304.')
  })
);
