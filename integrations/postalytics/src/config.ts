import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'development'])
      .default('production')
      .describe(
        'API environment to use. Production uses api.postalytics.com, development uses api-dev.postalytics.com.'
      )
  })
);
