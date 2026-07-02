import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .optional()
      .describe('Your Dynamics 365 environment URL (e.g., https://yourorg.crm.dynamics.com)')
  })
);
