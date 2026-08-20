import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe(
          'Base URL of your n8n instance API (e.g. https://your-instance.app.n8n.cloud/api/v1 or https://your-n8n-host:5678/api/v1)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
