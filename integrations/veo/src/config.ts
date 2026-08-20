import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'development'])
        .default('production')
        .describe(
          'VEO environment to connect to. Production uses api.veo.co.uk, development uses apiuat.veo.co.uk.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
