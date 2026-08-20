import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['default', 'us', 'eu'])
        .default('default')
        .describe(
          'API region. "default" uses api.zerobounce.net, "us" uses api-us.zerobounce.net, "eu" uses api-eu.zerobounce.net.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
