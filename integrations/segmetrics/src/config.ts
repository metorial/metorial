import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .describe('Your SegMetrics Account ID, found in your Account Settings page.'),
    integrationId: z
      .string()
      .optional()
      .describe(
        'Your SegMetrics Integration ID, found on your Account Integrations page. Required for import (write) operations.'
      )
  })
);
