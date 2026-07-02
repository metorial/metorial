import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    testMode: z
      .boolean()
      .default(false)
      .describe(
        'Enable test mode. While in test mode, nothing will be processed or billed. All responses will simulate a live environment.'
      )
  })
);
