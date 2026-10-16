import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'sandbox', 'stream_estate'])
      .default('production')
      .describe(
        'API host: production and sandbox use the legacy Melo hosts; stream_estate uses the current Stream Estate production API.'
      )
  })
);
