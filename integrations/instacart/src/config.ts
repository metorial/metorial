import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'development'])
        .default('production')
        .describe(
          'The environment to use. Development uses connect.dev.instacart.tools, production uses connect.instacart.com.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
