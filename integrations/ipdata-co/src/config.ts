import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    useEuEndpoint: z
      .boolean()
      .default(false)
      .describe(
        'Use the EU endpoint (eu-api.ipdata.co) to ensure end user data stays in the EU'
      )
  })
);
