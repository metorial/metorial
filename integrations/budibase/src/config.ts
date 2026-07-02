import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe(
        'Base URL for the Budibase API, e.g. https://budibase.app/api/public/v1 for Budibase Cloud or https://your-host/api/public/v1 for self-hosted'
      )
  })
);
