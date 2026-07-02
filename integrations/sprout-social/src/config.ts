import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    customerId: z
      .string()
      .describe(
        'Your Sprout Social customer ID. Retrieve this via the /v1/metadata/client endpoint or from your Sprout Social account settings.'
      )
  })
);
