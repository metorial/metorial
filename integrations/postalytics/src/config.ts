import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'development'])
        .default('production')
        .describe(
          'API environment to use. Production uses api.postalytics.com, development uses api-dev.postalytics.com.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
