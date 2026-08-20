import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://www.loomio.com')
        .describe(
          'Base URL of the Loomio instance. Use the default for Loomio hosted, or provide your self-hosted instance URL (e.g., https://loomio.example.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
