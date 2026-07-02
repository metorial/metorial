import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe(
        'The host URL of the NocoDB instance, e.g. https://app.nocodb.com or http://localhost:8080'
      )
  })
);
