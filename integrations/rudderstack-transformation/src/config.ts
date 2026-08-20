import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe(
          'RudderStack data plane region. Determines the API base URL: US (api.rudderstack.com) or EU (api.eu.rudderstack.com).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
