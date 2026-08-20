import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    cloudId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Confluence Cloud ID. Required for OAuth connections. Obtained from the accessible-resources endpoint after OAuth authorization.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    baseUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          'Base URL for Confluence Data Center (e.g., https://confluence.example.com). Not needed for Confluence Cloud OAuth connections.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
