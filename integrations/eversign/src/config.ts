import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    businessId: z
      .string()
      .describe(
        'The Business ID to use for API requests. Found in the Developer section of your Eversign account.'
      ),
    sandbox: z
      .boolean()
      .default(false)
      .describe(
        'Enable sandbox mode for non-production testing. Documents created in sandbox mode are not legally binding.'
      )
  })
);
