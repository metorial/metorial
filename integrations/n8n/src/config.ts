import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe(
        'Base URL of your n8n instance API (e.g. https://your-instance.app.n8n.cloud/api/v1 or https://your-n8n-host:5678/api/v1)'
      )
  })
);
