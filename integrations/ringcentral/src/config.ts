import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://platform.ringcentral.com')
      .describe('RingCentral API base URL')
  })
);
