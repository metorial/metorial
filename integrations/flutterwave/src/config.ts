import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['sandbox', 'production'])
      .default('production')
      .describe(
        'API v3 mode: sandbox requires a FLWSECK_TEST- Secret Key; production requires a live FLWSECK- Secret Key. Both use the documented v3 API host. A mismatched key is rejected before any request.'
      )
  })
);
