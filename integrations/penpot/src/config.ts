import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://design.penpot.app')
      .describe(
        'Base URL of the Penpot instance. Use https://design.penpot.app for the SaaS version, or your custom domain for self-hosted instances.'
      )
  })
);
