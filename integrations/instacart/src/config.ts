import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'development'])
      .default('production')
      .describe(
        'The environment to use. Development uses connect.dev.instacart.tools, production uses connect.instacart.com.'
      )
  })
);
