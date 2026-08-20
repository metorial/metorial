import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .url()
        .optional()
        .describe(
          'Custom CrowTerminal API base URL. Defaults to the standard CrowTerminal endpoint if not provided.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
