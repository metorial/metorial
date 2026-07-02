import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    testMode: z
      .boolean()
      .default(false)
      .describe('Enable test mode to operate against sandbox data without affecting live data')
  })
);
