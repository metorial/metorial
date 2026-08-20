import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'development'])
        .default('development')
        .describe(
          'MX environment to use. Development (INT) is limited to 100 users and select institutions.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
