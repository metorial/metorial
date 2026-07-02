import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://cloud.griptape.ai')
      .describe('Base URL for the Griptape Cloud API')
  })
);
