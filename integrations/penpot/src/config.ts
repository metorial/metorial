import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://design.penpot.app')
        .describe(
          'Base URL of the Penpot instance. Use https://design.penpot.app for the SaaS version, or your custom domain for self-hosted instances.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
