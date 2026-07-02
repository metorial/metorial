import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    username: z
      .string()
      .describe(
        'Your Mapbox account username. Required for most API operations that manage account resources.'
      )
  })
);
