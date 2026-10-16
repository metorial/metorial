import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['production', 'development'])
      .default('production')
      .describe(
        'Developer Platform environment and legacy Connect routing fallback. Development uses connect.dev.instacart.tools; production uses connect.instacart.com. An explicitly assigned Connect server in authentication takes precedence.'
      )
  })
);
