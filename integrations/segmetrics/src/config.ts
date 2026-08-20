import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe('Your SegMetrics Account ID, found in your Account Settings page.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    integrationId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Your SegMetrics Integration ID, found on your Account Integrations page. Required for import (write) operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
