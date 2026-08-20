import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    kibanaUrl: {
      schema: z
        .string()
        .describe('Base URL of the Kibana instance (e.g., https://my-kibana.example.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    spaceId: {
      schema: z
        .string()
        .optional()
        .describe('Kibana space ID. Leave empty for the default space.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
