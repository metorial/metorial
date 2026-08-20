import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://app.hex.tech')
        .describe(
          'Base URL for the Hex instance. Use the default for most users, or provide a custom URL for single tenant, EU multi tenant, or HIPAA multi tenant deployments (e.g. https://atreides.hex.tech, https://eu.hex.tech).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
