import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    username: {
      schema: z
        .string()
        .describe(
          'Your Mapbox account username. Required for most API operations that manage account resources.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
