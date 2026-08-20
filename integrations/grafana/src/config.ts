import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instanceUrl: {
      schema: z
        .string()
        .describe(
          'Base URL of the Grafana instance, e.g. https://your-grafana.grafana.net or https://grafana.example.com. Do not include a trailing slash or /api path.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Organization ID to scope API requests to. If not set, the default organization context is used.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiNamespace: {
      schema: z
        .string()
        .optional()
        .describe(
          'Grafana App Platform namespace for /apis endpoints. Defaults to "default" for org 1 or org-<organizationId> when organizationId is set. Grafana Cloud stacks can use stacks-<stack_id>.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
