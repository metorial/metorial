import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'Custom CrowTerminal API base URL. Defaults to the standard CrowTerminal endpoint if not provided.'
      )
  })
);
