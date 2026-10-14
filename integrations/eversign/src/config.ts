import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z
    .object({
      sandbox: z
        .boolean()
        .default(false)
        .describe(
          'Enable sandbox mode for non-production testing. Documents created in sandbox mode are not legally binding.'
        )
    })
    .passthrough()
);
