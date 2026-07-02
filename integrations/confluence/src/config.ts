import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    cloudId: z
      .string()
      .optional()
      .describe(
        'Confluence Cloud ID. Required for OAuth connections. Obtained from the accessible-resources endpoint after OAuth authorization.'
      ),
    baseUrl: z
      .string()
      .optional()
      .describe(
        'Base URL for Confluence Data Center (e.g., https://confluence.example.com). Not needed for Confluence Cloud OAuth connections.'
      )
  })
);
