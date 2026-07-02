import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z
      .enum(['v2', 'platform_v1'])
      .default('platform_v1')
      .describe(
        'API version to use. "platform_v1" uses api.rippling.com/platform/api/, "v2" uses rest.ripplingapis.com/'
      )
  })
);
