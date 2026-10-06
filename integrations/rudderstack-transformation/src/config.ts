import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe(
        'RudderStack management API region. Determines the API base URL: US (api.rudderstack.com) or EU (api.eu.rudderstack.com).'
      )
  })
);
