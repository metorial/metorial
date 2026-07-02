import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'development'])
      .default('production')
      .describe(
        'VEO environment to connect to. Production uses api.veo.co.uk, development uses apiuat.veo.co.uk.'
      )
  })
);
