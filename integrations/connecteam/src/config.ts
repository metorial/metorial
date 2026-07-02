import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .enum(['https://api.connecteam.com', 'https://api-au.connecteam.com'])
      .default('https://api.connecteam.com')
      .describe('API base URL. Use the Australia URL for Australian accounts.')
  })
);
