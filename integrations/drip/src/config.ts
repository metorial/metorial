import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .describe(
        'Your Drip account ID. Found in your Drip account settings under General Info.'
      )
  })
);
