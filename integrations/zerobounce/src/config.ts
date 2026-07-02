import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['default', 'us', 'eu'])
      .default('default')
      .describe(
        'API region. "default" uses api.zerobounce.net, "us" uses api-us.zerobounce.net, "eu" uses api-eu.zerobounce.net.'
      )
  })
);
