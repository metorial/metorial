import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe(
          'The host URL of the NocoDB instance, e.g. https://app.nocodb.com or http://localhost:8080'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
