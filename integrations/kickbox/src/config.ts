import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    sandbox: z
      .boolean()
      .default(false)
      .describe(
        'Enable sandbox mode to test without using credits. All results will be mock data.'
      )
  })
);
