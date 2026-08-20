import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe(
          'FreshBooks account ID. Found in the /me endpoint response under business_memberships. Required for accounting API calls (invoices, clients, expenses, payments, etc.).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    businessId: {
      schema: z
        .string()
        .optional()
        .describe(
          'FreshBooks business ID. Found in the /me endpoint response under business_memberships. Required for projects and time tracking API calls. If not provided, will default to the business associated with the accountId.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
