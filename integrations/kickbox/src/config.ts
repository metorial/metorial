import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    sandbox: z
      .boolean()
      .default(false)
      .describe(
        'Require a Sandbox API key beginning with test_ to prevent live verification requests. Sandbox results are mock data; the API key determines the mode.'
      )
  })
);
