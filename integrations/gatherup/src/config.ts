import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    agent: z
      .string()
      .optional()
      .describe(
        'Agent (client) ID for agency accounts. When using Global API credentials, call list_agency_clients to discover client IDs and specify which client to target. Omit this field when using credentials for an individual client.'
      )
  })
);
