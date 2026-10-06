import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z
      .enum(['v2', 'platform_v1'])
      .default('platform_v1')
      .describe(
        'Retained tools require platform_v1 credentials and endpoints. v2 is preserved as a legacy setting but rejected; the newer API has different resource contracts.'
      )
  })
);
