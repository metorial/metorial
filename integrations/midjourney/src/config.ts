import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.apiframe.pro')
      .describe('Base URL of the unofficial Midjourney API provider')
  })
);
