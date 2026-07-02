import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    kibanaUrl: z
      .string()
      .describe('Base URL of the Kibana instance (e.g., https://my-kibana.example.com)'),
    spaceId: z
      .string()
      .optional()
      .describe('Kibana space ID. Leave empty for the default space.')
  })
);
