import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'development'])
      .default('development')
      .describe(
        'MX environment to use. Development (INT) is limited to 100 users and select institutions.'
      )
  })
);
