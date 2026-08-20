import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          'Grafbase API URL. Defaults to https://api.grafbase.com/graphql. Override for self-hosted Enterprise Platform instances.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    accountSlug: {
      schema: z
        .string()
        .optional()
        .describe('Default account slug (personal or organization) to use for operations.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
