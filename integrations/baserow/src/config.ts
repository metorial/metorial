import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.baserow.io')
        .describe(
          'Base URL of your Baserow instance. Defaults to https://api.baserow.io for Baserow Cloud. For self-hosted instances, use your own instance URL (e.g. https://baserow.example.com).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
