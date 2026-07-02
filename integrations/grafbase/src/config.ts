import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiUrl: z
      .string()
      .optional()
      .describe(
        'Grafbase API URL. Defaults to https://api.grafbase.com/graphql. Override for self-hosted Enterprise Platform instances.'
      ),
    accountSlug: z
      .string()
      .optional()
      .describe('Default account slug (personal or organization) to use for operations.')
  })
);
