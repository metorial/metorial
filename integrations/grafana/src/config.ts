import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe(
        'Base URL of the Grafana instance, e.g. https://your-grafana.grafana.net or https://grafana.example.com. Do not include a trailing slash or /api path.'
      ),
    organizationId: z
      .string()
      .optional()
      .describe(
        'Organization ID to scope API requests to. If not set, the default organization context is used.'
      )
  })
);
